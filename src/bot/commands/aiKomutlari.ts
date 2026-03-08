import TelegramBot from 'node-telegram-bot-api';
import { claudeSor } from '../../integrations/claudeAI';
import { bugService } from '../../services/bugService';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export function aiKomutlariniKaydet(bot: TelegramBot): void {

  // /ai <soru>
  bot.onText(/^\/ai (.+)/i, async (mesaj, eslesme) => {
    const soru = eslesme?.[1]?.trim();
    if (!soru) {
      bot.sendMessage(mesaj.chat.id, '⚠️ Soru yazın.\nKullanım: `/ai Redis nasıl kullanılır?`', { parse_mode: 'Markdown' });
      return;
    }

    const bekliyorMesaji = await bot.sendMessage(mesaj.chat.id, '🤖 Düşünüyorum...');
    try {
      const yanit = await claudeSor(soru);
      await bot.deleteMessage(mesaj.chat.id, bekliyorMesaji.message_id);
      bot.sendMessage(mesaj.chat.id, `🤖 *AI Yanıtı*\n\n${yanit}`, { parse_mode: 'Markdown' });
    } catch (hata) {
      logger.error('AI komut hatası:', hata);
      bot.sendMessage(mesaj.chat.id, '❌ AI yanıt veremedi.');
    }
  });

  // /bug <açıklama> - Deepseek ile severity analizi
  bot.onText(/^\/bug (.+)/i, async (mesaj, eslesme) => {
    const aciklama = eslesme?.[1]?.trim();
    const ad = mesaj.from?.first_name || 'Bilinmeyen';
    const id = mesaj.from?.id || 0;

    if (!aciklama) {
      bot.sendMessage(mesaj.chat.id, '⚠️ Açıklama yazın.\nKullanım: `/bug Login iOS\'ta çalışmıyor`', { parse_mode: 'Markdown' });
      return;
    }

    try {
      const bug = await bugService.ekle(aciklama, id, ad);

      // Deepseek ile severity analizi
      const analiz = await claudeSor(
        `Bu bug raporunu değerlendir ve şu formatta yanıt ver (başka hiçbir şey yazma):
SEVERITY: [KRİTİK/YÜKSEK/ORTA/DÜŞÜK]
ÖZET: [1 cümle özet]
ÖNLEM: [1 cümle önerilen aksiyon]

Bug: "${aciklama}"`
      );

      const seviye = analiz.includes('KRİTİK') ? '🔴 KRİTİK' :
                     analiz.includes('YÜKSEK') ? '🟠 YÜKSEK' :
                     analiz.includes('ORTA')   ? '🟡 ORTA'   : '🟢 DÜŞÜK';

      const mesajMetni = `🐞 *Bug Raporu #${bug.id}*\n\n` +
        `👤 Bildiren: ${ad}\n` +
        `📝 Açıklama: ${aciklama}\n` +
        `${seviye}\n\n` +
        `🤖 *AI Analizi:*\n${analiz}`;

      const opts: TelegramBot.SendMessageOptions = { parse_mode: 'Markdown' };
      if (config.github.token && config.github.repo) {
        opts.reply_markup = {
          inline_keyboard: [[{ text: "🔗 GitHub'a Gönder", callback_data: `github:bug:${bug.id}` }]],
        };
      }
      bot.sendMessage(mesaj.chat.id, mesajMetni, opts);

      // KRİTİK ise adminleri mention et
      if (analiz.includes('KRİTİK')) {
        for (const adminId of config.telegram.adminIds) {
          try {
            bot.sendMessage(adminId, `🚨 *KRİTİK BUG!* #${bug.id}\n\n${aciklama}\n\nHemen incele!`, { parse_mode: 'Markdown' });
          } catch {}
        }
      }

    } catch (hata) {
      logger.error('Bug raporu hatası:', hata);
      bot.sendMessage(mesaj.chat.id, '❌ Bug raporu kaydedilemedi.');
    }
  });

  // /sinyal <yön> <sembol>
  bot.onText(/^\/sinyal (LONG|SHORT) (.+)/i, async (mesaj, eslesme) => {
    const yon = eslesme?.[1]?.toUpperCase();
    const sembol = eslesme?.[2]?.toUpperCase().trim();

    if (!yon || !sembol) {
      bot.sendMessage(mesaj.chat.id, '⚠️ Kullanım: `/sinyal LONG BTC`', { parse_mode: 'Markdown' });
      return;
    }

    const ikon = yon === 'LONG' ? '📈' : '📉';
    bot.sendMessage(
      mesaj.chat.id,
      `${ikon} *${yon} ${sembol}*\n\n` +
      `📍 Entry: —\n🎯 TP: —\n🛑 SL: —\n⚠️ Risk: —\n\n` +
      `_Seviyeleri kendiniz ekleyebilirsiniz._`,
      { parse_mode: 'Markdown' }
    );
  });
}
