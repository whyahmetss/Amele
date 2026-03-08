"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMi = adminMi;
exports.adminGerekli = adminGerekli;
const config_1 = require("../../config");
const logger_1 = require("../../utils/logger");
/**
 * Kullanıcının admin olup olmadığını kontrol eder
 */
function adminMi(kullaniciId) {
    return config_1.config.telegram.adminIds.includes(kullaniciId);
}
/**
 * Admin gerektiren komutlar için middleware
 */
function adminGerekli(bot, mesaj, callback) {
    const kullaniciId = mesaj.from?.id;
    if (!kullaniciId || !adminMi(kullaniciId)) {
        bot.sendMessage(mesaj.chat.id, '🚫 Bu komutu kullanma yetkiniz yok.\nSadece adminler kullanabilir.');
        logger_1.logger.warn(`Yetkisiz erişim: kullanıcı ${kullaniciId} → ${mesaj.text}`);
        return;
    }
    callback();
}
//# sourceMappingURL=auth.js.map