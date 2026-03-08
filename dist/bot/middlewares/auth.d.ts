import TelegramBot from 'node-telegram-bot-api';
/**
 * Kullanıcının admin olup olmadığını kontrol eder
 */
export declare function adminMi(kullaniciId: number): boolean;
/**
 * Admin gerektiren komutlar için middleware
 */
export declare function adminGerekli(bot: TelegramBot, mesaj: TelegramBot.Message, callback: () => void): void;
