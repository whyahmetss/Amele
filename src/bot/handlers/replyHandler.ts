import TelegramBot from 'node-telegram-bot-api';
import * as awaitingState from '../utils/awaitingState';
import { gorevService } from '../../services/gorevService';
import { bugService } from '../../services/bugService';
import { claudeSor } from '../../integrations/claudeAI';
import { logger } from '../../utils/logger';
import { config } from '../../config';

/**
 * Mesaja yanıt vererek "gorev" veya "bug" yazınca o mesajı görev/bug olarak ekler
 */
export function replyHandleriniKaydet(bot: TelegramBot): void {
  bot.on('message', async (mesaj) => {
    if (!mesaj.text || !mesaj.reply_to_message) return;
    if (mesaj.text.startsWith('/')) return;
    const chatId = mesaj.chat.id;
    const userId = mesaj.from?.id;
    if (userId && awaitingState.get(chatId, userId)) return; // Metin girişi bekleniyorsa reply işleme

    const metin = mesaj.text.trim().toLowerCase();
    const hedefMesaj = mesaj.reply_to_message;

    if (!hedefMesaj.text) {
      bot.sendMessage(mesaj.chat.id, '⚠️ Yanıt verdiğiniz mesaj metin içermiyor.');
      return;
    }

    const ad = mesaj.from?.first_name || 'Bilinmeyen';
    const id = mesaj.from?.id || 0;

    if (metin === 'gorev') {
      try {
        const gorev = await gorevService.ekle(hedefMesaj.text, id, ad);
        await bot.sendMessage(
          mesaj.chat.id,
          `✅ *Görev eklendi* #${gorev.id}\n\n📌 ${gorev.metin}\n👤 ${ad}`,
          { parse_mode: 'Markdown', reply_to_message_id: mesaj.message_id }
        );
      } catch (hata) {
        logger.error('Reply görev hatası:', hata);
        await bot.sendMessage(mesaj.chat.id, '❌ Görev eklenemedi.');
      }
      return;
    }

    if (metin === 'bug') {
      try {
        const bug = await bugService.ekle(hedefMesaj.text, id, ad);
        const analiz = await claudeSor(
          `Bu bug raporunu değerlendir. Sadece şu formatta yanıt ver:
SEVERITY: [KRİTİK/YÜKSEK/ORTA/DÜŞÜK]
ÖZET: [1 cümle]
ÖNLEM: [1 cümle]

Bug: "${hedefMesaj.text}"`
        );
        const seviye = analiz.includes('KRİTİK') ? '🔴 KRİTİK' :
                       analiz.includes('YÜKSEK') ? '🟠 YÜKSEK' :
                       analiz.includes('ORTA') ? '🟡 ORTA' : '🟢 DÜŞÜK';

        await bot.sendMessage(
          mesaj.chat.id,
          `🐞 *Bug Raporu #${bug.id}*\n\n👤 ${ad}\n📝 ${hedefMesaj.text}\n${seviye}\n\n🤖 ${analiz}`,
          { parse_mode: 'Markdown', reply_to_message_id: mesaj.message_id }
        );
        if (analiz.includes('KRİTİK')) {
          for (const adminId of config.telegram.adminIds) {
            try {
              await bot.sendMessage(adminId, `🚨 *KRİTİK BUG!* #${bug.id}\n\n${hedefMesaj.text}`, { parse_mode: 'Markdown' });
            } catch {}
          }
        }
      } catch (hata) {
        logger.error('Reply bug hatası:', hata);
        await bot.sendMessage(mesaj.chat.id, '❌ Bug raporu eklenemedi.');
      }
      return;
    }
  });
}
