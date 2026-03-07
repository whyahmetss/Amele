import cron from 'node-cron';
import { db } from '../models/database';
import { grupaMesajGonder } from '../bot';
import { logger } from '../utils/logger';

/**
 * Her gün 09:00'da günlük geliştirme raporu gönderir
 */
export function gunlukRaporuBaslat(): void {
  // Her gün 09:00 TR saati (UTC+3 = 06:00 UTC)
  cron.schedule('0 6 * * 1-5', async () => {
    logger.info('Günlük rapor hazırlanıyor...');
    try {
      const sonuc = await db.query(`
        SELECT
          (SELECT COUNT(*) FROM gorevler WHERE durum = 'tamamlandi' AND DATE(tamamlandi) = CURRENT_DATE) as tamamlanan_gorev,
          (SELECT COUNT(*) FROM bug_raporlari WHERE DATE(olusturuldu) = CURRENT_DATE) as yeni_bug,
          (SELECT COUNT(*) FROM deployler WHERE DATE(olusturuldu) = CURRENT_DATE) as deploy_sayisi,
          (SELECT COUNT(*) FROM hata_loglari WHERE DATE(olusturuldu) = CURRENT_DATE) as hata_sayisi,
          (SELECT COUNT(*) FROM gorevler WHERE durum != 'tamamlandi') as bekleyen_gorev
      `);

      const veri = sonuc.rows[0];
      const bugun = new Date().toLocaleDateString('tr-TR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      await grupaMesajGonder(
        `📊 *Günlük Geliştirme Raporu*\n` +
        `📅 ${bugun}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `✅ Tamamlanan Görev: ${veri.tamamlanan_gorev}\n` +
        `🐞 Yeni Bug: ${veri.yeni_bug}\n` +
        `🚀 Deploy Sayısı: ${veri.deploy_sayisi}\n` +
        `⚠️ API Hatası: ${veri.hata_sayisi}\n` +
        `📌 Bekleyen Görev: ${veri.bekleyen_gorev}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `_Günlük rapor · UstaGo Bot_`
      );
    } catch (hata) {
      logger.error('Günlük rapor hatası:', hata);
    }
  }, {
    timezone: 'Europe/Istanbul'
  });

  logger.info('Günlük rapor zamanlaması ayarlandı (Her gün 09:00 TR)');
}
