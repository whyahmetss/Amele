import cron from 'node-cron';
import { db } from '../models/database';
import { grupaMesajGonder } from '../bot';
import { logger } from '../utils/logger';
import { servisleriKontrolEt } from '../services/renderIzleme';
import { claudeSor } from '../integrations/claudeAI';

// Standup kayıtları: {kullanici_id: {plan: string, tamamlanan: string[], tarih: Date}}
const standuplar: Record<number, { plan: string; tamamlanan: string[]; ad: string; tarih: Date }> = {};

export function gunlukRaporuBaslat(): void {

  // Sabah 08:30 - Görev hatırlatması (3+ gündür açık görevler)
  cron.schedule('30 8 * * 1-5', async () => {
    try {
      const sonuc = await db.query(`
        SELECT id, metin, ekleyen_ad, olusturuldu
        FROM gorevler
        WHERE durum != 'tamamlandi' AND olusturuldu < NOW() - INTERVAL '3 days'
        ORDER BY olusturuldu ASC
      `);
      if (sonuc.rows.length > 0) {
        const satirlar = sonuc.rows.slice(0, 5).map((r: any) => `• #${r.id} ${r.metin} (${r.ekleyen_ad})`).join('\n');
        const ek = sonuc.rows.length > 5 ? `\n_+${sonuc.rows.length - 5} görev daha_` : '';
        await grupaMesajGonder(
          `⏰ *Görev Hatırlatması*\n3+ gündür açık ${sonuc.rows.length} görev var:\n\n${satirlar}${ek}`
        );
      }
    } catch (hata) {
      logger.error('Görev hatırlatma hatası:', hata);
    }
  }, { timezone: 'Europe/Istanbul' });

  // Sabah 09:00 - Günlük rapor
  cron.schedule('0 9 * * 1-5', async () => {
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
  }, { timezone: 'Europe/Istanbul' });

  // Akşam 18:00 - Standup özeti
  cron.schedule('0 18 * * 1-5', async () => {
    const bugun = new Date().toDateString();
    const bugunStanduplar = Object.values(standuplar).filter(
      s => s.tarih.toDateString() === bugun
    );

    if (bugunStanduplar.length === 0) return;

    let metin = `🌆 *Akşam Standup Özeti*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const s of bugunStanduplar) {
      const tamamlanan = s.tamamlanan.length > 0 ? s.tamamlanan.join(', ') : 'Belirtilmedi';
      metin += `👤 *${s.ad}*\n📋 Plan: ${s.plan}\n✅ Tamamlanan: ${tamamlanan}\n\n`;
    }
    await grupaMesajGonder(metin);
  }, { timezone: 'Europe/Istanbul' });

  // Her Pazar 20:00 - Haftalık özet + Proaktif AI önerisi
  cron.schedule('0 20 * * 0', async () => {
    try {
      const sonuc = await db.query(`
        SELECT
          (SELECT COUNT(*) FROM gorevler WHERE tamamlandi >= NOW() - INTERVAL '7 days') as tamamlanan,
          (SELECT COUNT(*) FROM bug_raporlari WHERE olusturuldu >= NOW() - INTERVAL '7 days') as buglar,
          (SELECT COUNT(*) FROM deployler WHERE olusturuldu >= NOW() - INTERVAL '7 days') as deployler,
          (SELECT COUNT(*) FROM hata_loglari WHERE olusturuldu >= NOW() - INTERVAL '7 days') as hatalar,
          (SELECT COUNT(*) FROM gorevler WHERE durum != 'tamamlandi') as bekleyen
      `);
      const v = sonuc.rows[0];

      const ozet = `✅ Tamamlanan: ${v.tamamlanan} | 🐞 Bug: ${v.buglar} | 🚀 Deploy: ${v.deployler} | 📌 Bekleyen: ${v.bekleyen}`;
      let aiOneri = '';
      try {
        aiOneri = await claudeSor(
          `Haftalık geliştirme özeti: ${ozet}. Bu veriye göre 2-3 cümleyle kısa bir değerlendirme ve öneri yaz. Örn: "Frontend yoğun, backend'e görev dağıtılabilir" gibi.`
        );
      } catch {}

      await grupaMesajGonder(
        `📆 *Haftalık Özet*\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `✅ Tamamlanan Görev: ${v.tamamlanan}\n` +
        `🐞 Toplam Bug: ${v.buglar}\n` +
        `🚀 Deploy: ${v.deployler}\n` +
        `⚠️ Hata: ${v.hatalar}\n` +
        `📌 Hala Bekleyen: ${v.bekleyen}\n\n` +
        (aiOneri ? `🤖 *AI Önerisi:*\n${aiOneri}\n\n` : '') +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `_Haftalık rapor · UstaGo Bot_`
      );
    } catch (hata) {
      logger.error('Haftalık rapor hatası:', hata);
    }
  }, { timezone: 'Europe/Istanbul' });

  // Her 5 dakikada Render servis izleme
  cron.schedule('*/5 * * * *', async () => {
    await servisleriKontrolEt();
  });

  logger.info('Günlük rapor zamanlaması ayarlandı (Her gün 09:00 TR)');
}

export function standupKaydet(kullaniciId: number, ad: string, plan: string): void {
  standuplar[kullaniciId] = { plan, tamamlanan: [], ad, tarih: new Date() };
}

export function standupTamamlananEkle(kullaniciId: number, tamamlanan: string): boolean {
  if (!standuplar[kullaniciId]) return false;
  standuplar[kullaniciId].tamamlanan.push(tamamlanan);
  return true;
}

export function standupGetir(kullaniciId: number) {
  return standuplar[kullaniciId] || null;
}

export function standupBugunTumunuGetir(): Array<{ ad: string; plan: string; tamamlanan: string[] }> {
  const bugun = new Date().toDateString();
  return Object.values(standuplar)
    .filter((s) => s.tarih.toDateString() === bugun)
    .map((s) => ({ ad: s.ad, plan: s.plan, tamamlanan: s.tamamlanan }));
}
