import TelegramBot from 'node-telegram-bot-api';
import { config } from '../../config';
import { claudeSor } from '../../integrations/claudeAI';
import { sesdenMetne } from '../../integrations/whisperAI';
import { logger } from '../../utils/logger';

/**
 * Sesli mesajı transkribe edip AI'ya sorar
 */
export function voiceHandleriniKaydet(bot: TelegramBot): void {
  bot.on('voice', async (mesaj) => {
    if (!config.openai.apiKey) {
      bot.sendMessage(mesaj.chat.id, '⚠️ Sesli mesaj özelliği için OPENAI_API_KEY tanımlanmalı.');
      return;
    }

    const fileId = mesaj.voice?.file_id;
    if (!fileId) return;

    try {
      const durum = await bot.sendMessage(mesaj.chat.id, '🎤 Ses işleniyor...');
      const dosya = await bot.getFile(fileId);
      const url = `https://api.telegram.org/file/bot${config.telegram.token}/${dosya.file_path}`;

      const axios = (await import('axios')).default;
      const { data } = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(data);

      const transkript = await sesdenMetne(buffer);
      if (transkript.startsWith('⚠️')) {
        await bot.editMessageText(transkript, { chat_id: mesaj.chat.id, message_id: durum.message_id });
        return;
      }

      await bot.editMessageText(`📝 *Söylediğin:* ${transkript}\n\n🤖 Düşünüyorum...`, {
        chat_id: mesaj.chat.id,
        message_id: durum.message_id,
        parse_mode: 'Markdown',
      });

      const yanit = await claudeSor(transkript);
      await bot.editMessageText(`📝 *Söylediğin:* ${transkript}\n\n🤖 *AI Yanıtı:*\n${yanit}`, {
        chat_id: mesaj.chat.id,
        message_id: durum.message_id,
        parse_mode: 'Markdown',
      });
    } catch (hata) {
      logger.error('Voice handler hatası:', hata);
      bot.sendMessage(mesaj.chat.id, '❌ Ses işlenemedi. Lütfen tekrar deneyin.');
    }
  });
}
