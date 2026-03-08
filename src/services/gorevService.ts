import { db } from '../models/database';
import { logger } from '../utils/logger';

export interface Gorev {
  id: number;
  metin: string;
  durum: 'bekliyor' | 'devam' | 'tamamlandi';
  oncelik: 'dusuk' | 'orta' | 'yuksek' | 'kritik';
  etiketler: string[];
  kategori?: string;
  atanan_id?: number;
  atanan_ad?: string;
  ekleyen_id: number;
  ekleyen_ad: string;
  github_issue_url?: string;
  olusturuldu: Date;
  tamamlandi?: Date;
}

const ONCELIK_IKON: Record<string, string> = {
  kritik: '🔴',
  yuksek: '🟠',
  orta: '🟡',
  dusuk: '🟢',
};

export const gorevService = {
  async ekle(metin: string, kullaniciId: number, kullaniciAd: string, opsiyonlar?: {
    oncelik?: string; etiketler?: string[]; kategori?: string; atananId?: number; atananAd?: string;
  }): Promise<Gorev> {
    const o = opsiyonlar || {};
    const sonuc = await db.query<Gorev>(
      `INSERT INTO gorevler (metin, ekleyen_id, ekleyen_ad, oncelik, etiketler, kategori, atanan_id, atanan_ad)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [metin.trim(), kullaniciId, kullaniciAd,
       o.oncelik || 'orta', o.etiketler || [], o.kategori || null,
       o.atananId || null, o.atananAd || null]
    );
    logger.info(`Görev eklendi: "${metin}" — ${kullaniciAd}`);
    return sonuc.rows[0];
  },

  async liste(durum?: string): Promise<Gorev[]> {
    if (durum) {
      const sonuc = await db.query<Gorev>(
        `SELECT * FROM gorevler WHERE durum = $1 ORDER BY
         CASE oncelik WHEN 'kritik' THEN 0 WHEN 'yuksek' THEN 1 WHEN 'orta' THEN 2 ELSE 3 END,
         olusturuldu DESC`,
        [durum]
      );
      return sonuc.rows;
    }
    const sonuc = await db.query<Gorev>(
      `SELECT * FROM gorevler WHERE durum != 'tamamlandi' ORDER BY
       CASE oncelik WHEN 'kritik' THEN 0 WHEN 'yuksek' THEN 1 WHEN 'orta' THEN 2 ELSE 3 END,
       olusturuldu ASC`
    );
    return sonuc.rows;
  },

  async getir(id: number): Promise<Gorev | null> {
    const r = await db.query<Gorev>(`SELECT * FROM gorevler WHERE id = $1`, [id]);
    return r.rows[0] || null;
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
    const sonuc = await db.query(`DELETE FROM gorevler WHERE id = $1`, [id]);
    return (sonuc.rowCount ?? 0) > 0;
  },

  async ata(id: number, atananId: number, atananAd: string): Promise<Gorev | null> {
    const r = await db.query<Gorev>(
      `UPDATE gorevler SET atanan_id = $2, atanan_ad = $3 WHERE id = $1 RETURNING *`,
      [id, atananId, atananAd]
    );
    return r.rows[0] || null;
  },

  async oncelikGuncelle(id: number, oncelik: string): Promise<Gorev | null> {
    const r = await db.query<Gorev>(
      `UPDATE gorevler SET oncelik = $2 WHERE id = $1 RETURNING *`,
      [id, oncelik]
    );
    return r.rows[0] || null;
  },

  async etiketEkle(id: number, etiket: string): Promise<Gorev | null> {
    const r = await db.query<Gorev>(
      `UPDATE gorevler SET etiketler = array_append(etiketler, $2) WHERE id = $1 RETURNING *`,
      [id, etiket]
    );
    return r.rows[0] || null;
  },

  async kategoriGuncelle(id: number, kategori: string): Promise<Gorev | null> {
    const r = await db.query<Gorev>(
      `UPDATE gorevler SET kategori = $2 WHERE id = $1 RETURNING *`,
      [id, kategori]
    );
    return r.rows[0] || null;
  },

  async githubUrlGuncelle(id: number, url: string): Promise<void> {
    await db.query(`UPDATE gorevler SET github_issue_url = $2 WHERE id = $1`, [id, url]);
  },

  async benzerBul(metin: string): Promise<Gorev[]> {
    const kelimeler = metin.toLowerCase().split(/\s+/).filter(k => k.length > 3).slice(0, 3);
    if (!kelimeler.length) return [];
    const koşul = kelimeler.map((_, i) => `LOWER(metin) LIKE $${i + 1}`).join(' OR ');
    const r = await db.query<Gorev>(
      `SELECT * FROM gorevler WHERE durum != 'tamamlandi' AND (${koşul}) LIMIT 3`,
      kelimeler.map(k => `%${k}%`)
    );
    return r.rows;
  },

  async istatistik(): Promise<{ tamamlanan: number; bekleyen: number; buHafta: number; satirlar: string }> {
    const [tamamlanan, bekleyen, buHafta] = await Promise.all([
      db.query<{ sayim: string }>(`SELECT COUNT(*) as sayim FROM gorevler WHERE durum = 'tamamlandi'`),
      db.query<{ sayim: string }>(`SELECT COUNT(*) as sayim FROM gorevler WHERE durum != 'tamamlandi'`),
      db.query<{ sayim: string }>(`SELECT COUNT(*) as sayim FROM gorevler WHERE tamamlandi >= NOW() - INTERVAL '7 days'`),
    ]);
    const t = parseInt(tamamlanan.rows[0]?.sayim || '0');
    const b = parseInt(bekleyen.rows[0]?.sayim || '0');
    const h = parseInt(buHafta.rows[0]?.sayim || '0');
    const toplam = t + b || 1;
    const dolu = Math.min(10, Math.floor((t / toplam) * 10));
    const bar = '█'.repeat(dolu) + '░'.repeat(10 - dolu);
    const satirlar = `📊 *Görev İstatistikleri*\n\n` +
      `✅ Tamamlanan (toplam): ${t}\n` +
      `📌 Bekleyen: ${b}\n` +
      `📅 Bu hafta tamamlanan: ${h}\n` +
      `\n${bar}\n_İlerleme_`;
    return { tamamlanan: t, bekleyen: b, buHafta: h, satirlar };
  },

  async exportMarkdown(): Promise<string> {
    const [aktif, tamamlanan] = await Promise.all([
      db.query<Gorev>(`SELECT * FROM gorevler WHERE durum != 'tamamlandi' ORDER BY
        CASE oncelik WHEN 'kritik' THEN 0 WHEN 'yuksek' THEN 1 WHEN 'orta' THEN 2 ELSE 3 END, olusturuldu ASC`),
      db.query<Gorev>(`SELECT * FROM gorevler WHERE durum = 'tamamlandi' AND tamamlandi >= NOW() - INTERVAL '14 days' ORDER BY tamamlandi DESC`),
    ]);
    const tarih = new Date().toLocaleString('tr-TR');
    let md = `# UstaGo Görev Listesi\n_Export: ${tarih}_\n\n## Aktif (${aktif.rows.length})\n\n`;
    for (const g of aktif.rows) {
      const t = new Date(g.olusturuldu).toLocaleDateString('tr-TR');
      const p = ONCELIK_IKON[g.oncelik] || '🟡';
      const etiket = g.etiketler?.length ? ` [${g.etiketler.join(', ')}]` : '';
      const atanan = g.atanan_ad ? ` → ${g.atanan_ad}` : '';
      md += `- [ ] ${p} **#${g.id}** ${g.metin}${etiket}${atanan} — ${g.ekleyen_ad} (${t})\n`;
    }
    md += `\n## Tamamlanan (son 14 gün, ${tamamlanan.rows.length})\n\n`;
    for (const g of tamamlanan.rows) {
      const t = g.tamamlandi ? new Date(g.tamamlandi).toLocaleDateString('tr-TR') : '-';
      md += `- [x] **#${g.id}** ${g.metin} — ${g.ekleyen_ad} (${t})\n`;
    }
    return md;
  },

  async exportJSON(): Promise<string> {
    const r = await db.query<Gorev>(`SELECT * FROM gorevler ORDER BY id`);
    return JSON.stringify(r.rows, null, 2);
  },

  async exportCSV(): Promise<string> {
    const r = await db.query<Gorev>(`SELECT * FROM gorevler ORDER BY id`);
    const header = 'id,metin,durum,oncelik,etiketler,kategori,ekleyen_ad,atanan_ad,olusturuldu,tamamlandi\n';
    const rows = r.rows.map(g =>
      `${g.id},"${(g.metin || '').replace(/"/g, '""')}",${g.durum},${g.oncelik},"${(g.etiketler || []).join(';')}","${g.kategori || ''}","${g.ekleyen_ad}","${g.atanan_ad || ''}","${g.olusturuldu}","${g.tamamlandi || ''}"`
    ).join('\n');
    return header + rows;
  },

  formatListeMesaji(gorevler: Gorev[]): string {
    if (gorevler.length === 0) return '✅ Aktif görev bulunmuyor.';
    const satirlar = gorevler.map((g) => {
      const p = ONCELIK_IKON[g.oncelik] || '📌';
      const tarih = new Date(g.olusturuldu).toLocaleDateString('tr-TR');
      const etiket = g.etiketler?.length ? ` ${g.etiketler.map(e => `#${e}`).join(' ')}` : '';
      const atanan = g.atanan_ad ? ` → ${g.atanan_ad}` : '';
      return `${p} *#${g.id}* ${g.metin}${etiket}${atanan}\n   └ ${g.ekleyen_ad} · ${tarih}`;
    });
    return `📋 *Aktif Görevler* (${gorevler.length})\n\n${satirlar.join('\n\n')}`;
  },

  formatListeButonlu(gorevler: Gorev[]): { metin: string; butonlar: any[][] } {
    if (gorevler.length === 0) return { metin: '✅ Aktif görev bulunmuyor.', butonlar: [] };
    const satirlar = gorevler.map((g) => {
      const p = ONCELIK_IKON[g.oncelik] || '📌';
      const etiket = g.etiketler?.length ? ` ${g.etiketler.map(e => `#${e}`).join(' ')}` : '';
      const atanan = g.atanan_ad ? ` → ${g.atanan_ad}` : '';
      return `${p} *#${g.id}* ${g.metin}${etiket}${atanan}`;
    });
    const metin = `📋 *Aktif Görevler* (${gorevler.length})\n\n${satirlar.join('\n')}`;
    const butonlar = gorevler.slice(0, 8).map((g) => [
      { text: `✓ #${g.id}`, callback_data: `act:bitir:${g.id}` },
      { text: `🗑 #${g.id}`, callback_data: `act:sil:${g.id}` },
      { text: `👤 #${g.id}`, callback_data: `act:ata:${g.id}` },
    ]);
    return { metin, butonlar };
  },
};
