import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';
import { logger } from '../utils/logger';
import { rateLimiter } from './middlewares/rateLimiter';
import { genelKomutlariniKaydet } from './commands/genelKomutlar';
import { gorevKomutlariniKaydet } from './commands/gorevKomutlari';
import { sunucuKomutlariniKaydet } from './commands/sunucuKomutlari';
import { aiKomutlariniKaydet } from './commands/aiKomutlari';
import { nobetKomutlariniKaydet } from './commands/nobetKomutlari';
import { isimHandleriniKaydet } from './handlers/isimHandler';
import { replyHandleriniKaydet } from './handlers/replyHandler';
import { voiceHandleriniKaydet } from './handlers/voiceHandler';
import { inlineHandleriniKaydet } from './handlers/inlineHandler';
import { ekstraKomutlariniKaydet } from './commands/ekstraKomutlar';

let botInstance: TelegramBot | null = null;

export function botOlustur(): TelegramBot {
  if (botInstance) return botInstance;

  const bot = new TelegramBot(config.telegram.token, { polling: true });

  bot.on('message', async (mesaj) => {
    if (!mesaj.text?.startsWith('/')) return;
    await rateLimiter(bot, mesaj);
  });

  genelKomutlariniKaydet(bot);
  gorevKomutlariniKaydet(bot);
  sunucuKomutlariniKaydet(bot);
  aiKomutlariniKaydet(bot);
  nobetKomutlariniKaydet(bot);
  isimHandleriniKaydet(bot);
  replyHandleriniKaydet(bot);
  voiceHandleriniKaydet(bot);
  inlineHandleriniKaydet(bot);
  ekstraKomutlariniKaydet(bot);

  bot.on('polling_error', (hata) => logger.error('Telegram polling hatası:', hata));
  bot.on('error', (hata) => logger.error('Telegram bot hatası:', hata));

  logger.info('✅ Telegram botu başlatıldı');
  botInstance = bot;
  return bot;
}

export function botAl(): TelegramBot | null {
  return botInstance;
}

export async function grupaMesajGonder(metin: string, parseMode: 'Markdown' | 'HTML' = 'Markdown'): Promise<void> {
  const bot = botAl();
  if (!bot) return;
  try {
    await bot.sendMessage(config.telegram.chatId, metin, { parse_mode: parseMode });
  } catch (hata) {
    logger.error('Grup mesajı gönderilemedi:', hata);
  }
}
