import { db } from '../models/database';
import { logger } from '../utils/logger';

export interface NobetKayit {
  id: number;
  kullanici_id: number;
  kullanici_ad: string;
  tarih: string;
  olusturuldu: Date;
}

export const nobetService = {
  async ekle(kullaniciId: number, kullaniciAd: string, tarih: string): Promise<NobetKayit | null> {
    const gun = tarih || new Date().toISOString().split('T')[0];
    try {
      const sonuc = await db.query<NobetKayit>(
        `INSERT INTO nobet_takvimi (kullanici_id, kullanici_ad, tarih)
         VALUES ($1, $2, $3)
         ON CONFLICT (tarih) DO UPDATE SET kullanici_id = $1, kullanici_ad = $2
         RETURNING *`,
        [kullaniciId, kullaniciAd, gun]
      );
      logger.info(`Nöbet atandı: ${gun} → ${kullaniciAd}`);
      return sonuc.rows[0];
    } catch (hata) {
      logger.error('Nöbet ekleme hatası:', hata);
      return null;
    }
  },

  async bugunGetir(): Promise<NobetKayit | null> {
    const bugun = new Date().toISOString().split('T')[0];
    const sonuc = await db.query<NobetKayit>(
      `SELECT * FROM nobet_takvimi WHERE tarih = $1`,
      [bugun]
    );
    return sonuc.rows[0] || null;
  },

  async haftalikGetir(): Promise<NobetKayit[]> {
    const sonuc = await db.query<NobetKayit>(
      `SELECT * FROM nobet_takvimi
       WHERE tarih >= CURRENT_DATE AND tarih < CURRENT_DATE + INTERVAL '7 days'
       ORDER BY tarih ASC`
    );
    return sonuc.rows;
  },
};
