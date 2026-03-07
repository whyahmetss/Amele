import { db } from '../models/database';
import { logger } from '../utils/logger';

export interface Bug {
  id: number;
  aciklama: string;
  bildiren_id: number;
  bildiren_ad: string;
  durum: 'acik' | 'inceleniyor' | 'cozuldu';
  olusturuldu: Date;
}

export const bugService = {
  async ekle(aciklama: string, kullaniciId: number, kullaniciAd: string): Promise<Bug> {
    const sonuc = await db.query<Bug>(
      `INSERT INTO bug_raporlari (aciklama, bildiren_id, bildiren_ad)
       VALUES ($1, $2, $3) RETURNING *`,
      [aciklama, kullaniciId, kullaniciAd]
    );
    logger.info(`Bug raporu eklendi: "${aciklama.slice(0, 50)}" — ${kullaniciAd}`);
    return sonuc.rows[0];
  },

  async liste(durum?: string): Promise<Bug[]> {
    if (durum) {
      const sonuc = await db.query<Bug>(
        `SELECT * FROM bug_raporlari WHERE durum = $1 ORDER BY olusturuldu DESC`,
        [durum]
      );
      return sonuc.rows;
    }
    const sonuc = await db.query<Bug>(
      `SELECT * FROM bug_raporlari WHERE durum != 'cozuldu' ORDER BY olusturuldu DESC LIMIT 10`
    );
    return sonuc.rows;
  },

  async gunlukSayim(): Promise<number> {
    const sonuc = await db.query<{ sayim: string }>(
      `SELECT COUNT(*) as sayim FROM bug_raporlari WHERE DATE(olusturuldu) = CURRENT_DATE`
    );
    return parseInt(sonuc.rows[0]?.sayim || '0');
  },

  formatMesaj(bug: Bug): string {
    const tarih = new Date(bug.olusturuldu).toLocaleString('tr-TR');
    return (
      `🐞 *Bug Raporu #${bug.id}*\n\n` +
      `👤 Bildiren: ${bug.bildiren_ad}\n` +
      `📝 Açıklama: ${bug.aciklama}\n` +
      `📊 Durum: ${bug.durum.toUpperCase()}\n` +
      `🕐 Saat: ${tarih}`
    );
  },
};
