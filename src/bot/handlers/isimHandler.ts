import TelegramBot from 'node-telegram-bot-api';
import { claudeSor } from '../../integrations/claudeAI';
import { logger } from '../../utils/logger';

const TETIKLEYICI_KELIMELER = ['amele', 'amele_bot', '@amele_bot'];

export function isimHandleriniKaydet(bot: TelegramBot): void {
  bot.on('message', async (mesaj) => {
    if (!mesaj.text) return;
    if (mesaj.text.startsWith('/')) return;

    const metin = mesaj.text.toLowerCase();
    const tetiklendi = TETIKLEYICI_KELIMELER.some(k => metin.includes(k));
    if (!tetiklendi) return;

    // İsmi mesajdan çıkar, sadece soruyu al
    let soru = mesaj.text;
    TETIKLEYICI_KELIMELER.forEach(k => {
      soru = soru.replace(new RegExp(k, 'gi'), '').trim();
    });

    if (!soru) soru = 'Merhaba! Nasılsın?';

    logger.info(`İsim tetiklendi: "${mesaj.text}"`);

    try {
      const yanit = await claudeSor(soru);
      bot.sendMessage(mesaj.chat.id, `🤖 ${yanit}`, {
        reply_to_message_id: mesaj.message_id
      });
    } catch (hata) {
      logger.error('İsim handler hatası:', hata);
    }
  });
}
