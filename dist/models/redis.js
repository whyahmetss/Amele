"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const redis_1 = require("redis");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const istemci = (0, redis_1.createClient)({ url: config_1.config.redis.url });
istemci.on('error', (hata) => logger_1.logger.error('Redis hatası:', hata));
istemci.on('connect', () => logger_1.logger.info('Redis bağlantısı kuruldu'));
class RedisIstemci {
    async baglan() {
        if (!istemci.isOpen) {
            await istemci.connect();
        }
    }
    async al(anahtar) {
        return await istemci.get(anahtar);
    }
    async kaydet(anahtar, deger, ttlSaniye) {
        if (ttlSaniye) {
            await istemci.setEx(anahtar, ttlSaniye, deger);
        }
        else {
            await istemci.set(anahtar, deger);
        }
    }
    async sil(anahtar) {
        await istemci.del(anahtar);
    }
    async artir(anahtar) {
        return await istemci.incr(anahtar);
    }
    async ttlAyarla(anahtar, saniye) {
        await istemci.expire(anahtar, saniye);
    }
    async saglik() {
        try {
            await istemci.ping();
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.redis = new RedisIstemci();
//# sourceMappingURL=redis.js.map