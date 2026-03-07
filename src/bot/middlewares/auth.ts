import TelegramBot from 'node-telegram-bot-api';
import { config } from '../../config';
import { logger } from '../../utils/logger';

/**
 * Kullanıcının admin olup olmadığını kontrol eder
 */
export function adminMi(kullaniciId: number): boolean {
  return config.telegram.adminIds.includes(kullaniciId);
}

/**
 * Admin gerektiren komutlar için middleware
 */
export function adminGerekli(
  bot: TelegramBot,
  mesaj: TelegramBot.Message,
  callback: () => void
): void {
  const kullaniciId = mesaj.from?.id;

  if (!kullaniciId || !adminMi(kullaniciId)) {
    bot.sendMessage(
      mesaj.chat.id,
      '🚫 Bu komutu kullanma yetkiniz yok.\nSadece adminler kullanabilir.'
    );
    logger.warn(`Yetkisiz erişim: kullanıcı ${kullaniciId} → ${mesaj.text}`);
    return;
  }

  callback();
}
