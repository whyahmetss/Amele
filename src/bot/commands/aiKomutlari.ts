import TelegramBot from 'node-telegram-bot-api';
import { claudeSor } from '../../integrations/claudeAI';
import { bugService } from '../../services/bugService';
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
      bot.sendMessage(
        mesaj.chat.id,
        `🤖 *AI Yanıtı*\n\n${yanit}`,
        { parse_mode: 'Markdown' }
      );
    } catch (hata) {
      logger.error('AI komut hatası:', hata);
      bot.sendMessage(mesaj.chat.id, '❌ AI yanıt veremedi.');
    }
  });

  // /bug <açıklama>
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
      bot.sendMessage(
        mesaj.chat.id,
        bugService.formatMesaj(bug),
        { parse_mode: 'Markdown' }
      );
    } catch (hata) {
      logger.error('Bug raporu hatası:', hata);
      bot.sendMessage(mesaj.chat.id, '❌ Bug raporu kaydedilemedi.');
    }
  });

  // /sinyal <yön> <sembol>
  // Örnek: /sinyal LONG BTC
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
      `📍 Entry: —\n` +
      `🎯 TP: —\n` +
      `🛑 SL: —\n` +
      `⚠️ Risk: —\n\n` +
      `_Seviyeleri kendiniz ekleyebilirsiniz._`,
      { parse_mode: 'Markdown' }
    );
  });
}
