import { db } from '../models/database';
import { logger } from '../utils/logger';

export interface Gorev {
  id: number;
  metin: string;
  durum: 'bekliyor' | 'devam' | 'tamamlandi';
  ekleyen_id: number;
  ekleyen_ad: string;
  olusturuldu: Date;
  tamamlandi?: Date;
}

export const gorevService = {
  async ekle(metin: string, kullaniciId: number, kullaniciAd: string): Promise<Gorev> {
    const sonuc = await db.query<Gorev>(
      `INSERT INTO gorevler (metin, ekleyen_id, ekleyen_ad)
       VALUES ($1, $2, $3) RETURNING *`,
      [metin.trim(), kullaniciId, kullaniciAd]
    );
    logger.info(`Görev eklendi: "${metin}" — ${kullaniciAd}`);
    return sonuc.rows[0];
  },

  async liste(durum?: string): Promise<Gorev[]> {
    if (durum) {
      const sonuc = await db.query<Gorev>(
        `SELECT * FROM gorevler WHERE durum = $1 ORDER BY olusturuldu DESC`,
        [durum]
      );
      return sonuc.rows;
    }
    const sonuc = await db.query<Gorev>(
      `SELECT * FROM gorevler WHERE durum != 'tamamlandi' ORDER BY olusturuldu ASC`
    );
    return sonuc.rows;
  },

  async bitir(id: number): Promise<Gorev | null> {
    const sonuc = await db.query<Gorev>(
      `UPDATE gorevler SET durum = 'tamamlandi', tamamlandi = NOW()
       WHERE id = $1 AND durum != 'tamamlandi' RETURNING *`,
      [id]
    );
    if (sonuc.rows[0]) logger.info(`Görev tamamlandı: #${id}`);
    return sonuc.rows[0] || null;
  },

  async sil(id: number): Promise<boolean> {
    const sonuc = await db.query(
      `DELETE FROM gorevler WHERE id = $1`,
      [id]
    );
    return (sonuc.rowCount ?? 0) > 0;
  },

  formatListeMesaji(gorevler: Gorev[]): string {
    if (gorevler.length === 0) {
      return '✅ Aktif görev bulunmuyor.';
    }

    const satirlar = gorevler.map((g, i) => {
      const ikon = g.durum === 'devam' ? '🔄' : '📌';
      const tarih = new Date(g.olusturuldu).toLocaleDateString('tr-TR');
      return `${ikon} *#${g.id}* ${g.metin}\n   └ ${g.ekleyen_ad} · ${tarih}`;
    });

    return `📋 *Aktif Görevler* (${gorevler.length})\n\n${satirlar.join('\n\n')}`;
  },
};
