import { redis } from '../../models/redis';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import TelegramBot from 'node-telegram-bot-api';

/**
 * Redis tabanlı rate limiter
 * Kullanıcı başına pencere süresinde maksimum istek kontrolü
 */
export async function rateLimiter(
  bot: TelegramBot,
  mesaj: TelegramBot.Message
): Promise<boolean> {
  const kullaniciId = mesaj.from?.id;
  if (!kullaniciId) return false;

  const anahtar = `rate:${kullaniciId}`;
  const pencereSaniye = Math.floor(config.security.rateLimitWindow / 1000);

  try {
    const sayac = await redis.artir(anahtar);

    if (sayac === 1) {
      await redis.ttlAyarla(anahtar, pencereSaniye);
    }

    if (sayac > config.security.rateLimitMax) {
      bot.sendMessage(
        mesaj.chat.id,
        `⏳ Çok fazla istek gönderiyorsunuz.\n${pencereSaniye} saniye bekleyin.`
      );
      logger.warn(`Rate limit aşıldı: kullanıcı ${kullaniciId}`);
      return false;
    }

    return true;
  } catch (hata) {
    // Redis hatasında geç — servis dışı kalmasın
    logger.error('Rate limiter hatası:', hata);
    return true;
  }
}
