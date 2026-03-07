import { db } from '../models/database';
import { logger } from '../utils/logger';

export interface HataLog {
  id: number;
  servis: string;
  endpoint: string;
  hata_mesaji: string;
  stack_trace?: string;
  onem: 'dusuk' | 'orta' | 'yuksek' | 'kritik';
  olusturuldu: Date;
}

export const hataService = {
  async kaydet(veri: Partial<HataLog>): Promise<HataLog> {
    const sonuc = await db.query<HataLog>(
      `INSERT INTO hata_loglari (servis, endpoint, hata_mesaji, stack_trace, onem)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [veri.servis, veri.endpoint, veri.hata_mesaji, veri.stack_trace, veri.onem || 'orta']
    );
    logger.error(`API Hatası kaydedildi: ${veri.servis}${veri.endpoint}`);
    return sonuc.rows[0];
  },

  async gunlukSayim(): Promise<number> {
    const sonuc = await db.query<{ sayim: string }>(
      `SELECT COUNT(*) as sayim FROM hata_loglari WHERE DATE(olusturuldu) = CURRENT_DATE`
    );
    return parseInt(sonuc.rows[0]?.sayim || '0');
  },

  formatMesaj(hata: Partial<HataLog>): string {
    const onemIkon: Record<string, string> = {
      dusuk: '🟡',
      orta: '🟠',
      yuksek: '🔴',
      kritik: '🚨',
    };
    const ikon = onemIkon[hata.onem || 'orta'] || '⚠️';
    const tarih = new Date().toLocaleString('tr-TR');

    return (
      `${ikon} *API HATASI*\n\n` +
      `🔧 Servis: \`${hata.servis || '-'}\`\n` +
      `📍 Endpoint: \`${hata.endpoint || '-'}\`\n` +
      `💥 Hata: ${hata.hata_mesaji || '-'}\n` +
      `⚡ Önem: ${(hata.onem || 'orta').toUpperCase()}\n` +
      `🕐 Saat: ${tarih}`
    );
  },
};
