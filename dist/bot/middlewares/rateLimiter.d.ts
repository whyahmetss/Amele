import TelegramBot from 'node-telegram-bot-api';
/**
 * Redis tabanlı rate limiter
 * Kullanıcı başına pencere süresinde maksimum istek kontrolü
 */
export declare function rateLimiter(bot: TelegramBot, mesaj: TelegramBot.Message): Promise<boolean>;
