import TelegramBot from 'node-telegram-bot-api';
import { claudeSor } from '../../integrations/claudeAI';
import { db } from '../../models/database';
import { logger } from '../../utils/logger';
import { standupKaydet, standupTamamlananEkle, standupGetir } from '../../jobs/gunlukRapor';
import { servisleriGetir } from '../../services/renderIzleme';

export function ekstraKomutlariniKaydet(bot: TelegramBot): void {

  // /standup <plan>  veya  /standup bitti <ne yaptın>
  bot.onText(/^\/standup bitti (.+)/i, async (mesaj, eslesme) => {
    const uid = mesaj.from?.id || 0;
    const tamamlanan = eslesme?.[1]?.trim() || '';
    const eklendi = standupTamamlananEkle(uid, tamamlanan);
    if (!eklendi) {
      bot.sendMessage(mesaj.chat.id, '⚠️ Önce `/standup <planın>` ile standup başlat.', { parse_mode: 'Markdown' });
      return;
    }
    bot.sendMessage(mesaj.chat.id, `✅ Tamamlanan kaydedildi: _${tamamlanan}_\nAkşam 18:00'de özet gönderilecek.`, { parse_mode: 'Markdown' });
  });

  bot.onText(/^\/standup(?! bitti)(.*)$/i, async (mesaj, eslesme) => {
    const uid = mesaj.from?.id || 0;
    const ad = mesaj.from?.first_name || 'Bilinmeyen';
    const plan = eslesme?.[1]?.trim();

    if (!plan) {
      const mevcut = standupGetir(uid);
      if (mevcut) {
        bot.sendMessage(mesaj.chat.id,
          `📋 *Bugünkü Standup'ın*\n\n` +
          `📌 Plan: ${mevcut.plan}\n` +
          `✅ Tamamlanan: ${mevcut.tamamlanan.join(', ') || 'Henüz yok'}\n\n` +
          `Tamamlanan eklemek için: \`/standup bitti <ne yaptın>\``,
          { parse_mode: 'Markdown' }
        );
      } else {
        bot.sendMessage(mesaj.chat.id, '📝 Kullanım:\n`/standup bugün ne yapacaksın`\n`/standup bitti ne yaptın`', { parse_mode: 'Markdown' });
      }
      return;
    }

    standupKaydet(uid, ad, plan);
    bot.sendMessage(mesaj.chat.id,
      `✅ *Standup kaydedildi!*\n\n👤 ${ad}\n📋 Plan: ${plan}\n\nAkşam 18:00'de özet gönderilecek 🕕`,
      { parse_mode: 'Markdown' }
    );
  });

  // /changelog - son commitler + Deepseek özeti
  bot.onText(/^\/changelog/i, async (mesaj) => {
    bot.sendMessage(mesaj.chat.id, '📝 Changelog hazırlanıyor...');
    try {
      const sonuc = await db.query(`
        SELECT proje, branch, commit_msg, yapan, olusturuldu
        FROM deployler
        ORDER BY olusturuldu DESC
        LIMIT 10
      `);

      if (!sonuc.rows.length) {
        bot.sendMessage(mesaj.chat.id, '📭 Henüz deploy kaydı yok.');
        return;
      }

      const commitListesi = sonuc.rows.map((r: any, i: number) => {
        const tarih = new Date(r.olusturuldu).toLocaleDateString('tr-TR');
        return `${i+1}. [${tarih}] ${r.proje}/${r.branch}: ${r.commit_msg} (${r.yapan})`;
      }).join('\n');

      const analiz = await claudeSor(
        `Aşağıdaki son commit geçmişini analiz et. Ne tür değişiklikler yapıldı? Önemli gelişmeler var mı? Kısa özet yaz:\n\n${commitListesi}`
      );

      bot.sendMessage(mesaj.chat.id,
        `📝 *Changelog & Analiz*\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `*Son Commitler:*\n\`\`\`\n${commitListesi}\n\`\`\`\n\n` +
        `🤖 *AI Özeti:*\n${analiz}`,
        { parse_mode: 'Markdown' }
      );
    } catch (hata) {
      logger.error('Changelog hatası:', hata);
      bot.sendMessage(mesaj.chat.id, '❌ Changelog alınamadı.');
    }
  });

  // /servisler - manuel servis durumu
  bot.onText(/^\/servisler/i, async (mesaj) => {
    const servisler = servisleriGetir();
    let metin = `🖥️ *Servis Durumu*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const s of servisler) {
      const durum = s.sonDurum === null ? '⏳ Kontrol edilmedi' : s.sonDurum ? '🟢 Çevrimiçi' : '🔴 Çevrimdışı';
      const kontrol = s.sonKontrol ? new Date(s.sonKontrol).toLocaleTimeString('tr-TR') : '-';
      metin += `${durum} *${s.ad}*\nSon kontrol: ${kontrol}\n\n`;
    }
    metin += `_Her 5 dakikada otomatik kontrol edilir_`;
    bot.sendMessage(mesaj.chat.id, metin, { parse_mode: 'Markdown' });
  });
}
