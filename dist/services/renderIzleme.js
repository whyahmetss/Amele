"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.servisleriKontrolEt = servisleriKontrolEt;
exports.servisleriGetir = servisleriGetir;
const axios_1 = __importDefault(require("axios"));
const bot_1 = require("../bot");
const logger_1 = require("../utils/logger");
const servisler = [
    { url: 'https://amele.onrender.com', ad: 'Amele Bot', sonDurum: null, sonKontrol: null },
    { url: 'https://warren-1.onrender.com', ad: 'Warren Bot', sonDurum: null, sonKontrol: null },
];
async function servisleriKontrolEt() {
    for (const servis of servisler) {
        try {
            const yanit = await axios_1.default.get(servis.url, { timeout: 10000 });
            const calisiyor = yanit.status >= 200 && yanit.status < 400;
            // Down → Up geçişi
            if (servis.sonDurum === false && calisiyor) {
                await (0, bot_1.grupaMesajGonder)(`✅ *${servis.ad} tekrar çevrimiçi!*\n🕐 ${new Date().toLocaleString('tr-TR')}`);
                logger_1.logger.info(`${servis.ad} tekrar online`);
            }
            // Up → Down geçişi
            if (servis.sonDurum === true && !calisiyor) {
                await (0, bot_1.grupaMesajGonder)(`🔴 *${servis.ad} ÇEVRIMDIŞI!*\n⚠️ Servis yanıt vermiyor!\n🕐 ${new Date().toLocaleString('tr-TR')}`);
                logger_1.logger.error(`${servis.ad} offline!`);
            }
            servis.sonDurum = calisiyor;
        }
        catch {
            if (servis.sonDurum !== false) {
                await (0, bot_1.grupaMesajGonder)(`🔴 *${servis.ad} ÇEVRIMDIŞI!*\n⚠️ Bağlantı hatası!\n🕐 ${new Date().toLocaleString('tr-TR')}`);
                logger_1.logger.error(`${servis.ad} erişilemiyor`);
            }
            servis.sonDurum = false;
        }
        servis.sonKontrol = new Date();
    }
}
function servisleriGetir() {
    return servisler;
}
//# sourceMappingURL=renderIzleme.js.map