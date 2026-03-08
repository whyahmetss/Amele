"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = rateLimiter;
const redis_1 = require("../../models/redis");
const config_1 = require("../../config");
const logger_1 = require("../../utils/logger");
/**
 * Redis tabanlı rate limiter
 * Kullanıcı başına pencere süresinde maksimum istek kontrolü
 */
async function rateLimiter(bot, mesaj) {
    const kullaniciId = mesaj.from?.id;
    if (!kullaniciId)
        return false;
    const anahtar = `rate:${kullaniciId}`;
    const pencereSaniye = Math.floor(config_1.config.security.rateLimitWindow / 1000);
    try {
        const sayac = await redis_1.redis.artir(anahtar);
        if (sayac === 1) {
            await redis_1.redis.ttlAyarla(anahtar, pencereSaniye);
        }
        if (sayac > config_1.config.security.rateLimitMax) {
            bot.sendMessage(mesaj.chat.id, `⏳ Çok fazla istek gönderiyorsunuz.\n${pencereSaniye} saniye bekleyin.`);
            logger_1.logger.warn(`Rate limit aşıldı: kullanıcı ${kullaniciId}`);
            return false;
        }
        return true;
    }
    catch (hata) {
        // Redis hatasında geç — servis dışı kalmasın
        logger_1.logger.error('Rate limiter hatası:', hata);
        return true;
    }
}
//# sourceMappingURL=rateLimiter.js.map