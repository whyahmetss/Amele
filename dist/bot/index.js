"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.botOlustur = botOlustur;
exports.botAl = botAl;
exports.grupaMesajGonder = grupaMesajGonder;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const rateLimiter_1 = require("./middlewares/rateLimiter");
const genelKomutlar_1 = require("./commands/genelKomutlar");
const gorevKomutlari_1 = require("./commands/gorevKomutlari");
const sunucuKomutlari_1 = require("./commands/sunucuKomutlari");
const aiKomutlari_1 = require("./commands/aiKomutlari");
const nobetKomutlari_1 = require("./commands/nobetKomutlari");
const isimHandler_1 = require("./handlers/isimHandler");
const replyHandler_1 = require("./handlers/replyHandler");
const voiceHandler_1 = require("./handlers/voiceHandler");
const inlineHandler_1 = require("./handlers/inlineHandler");
const ekstraKomutlar_1 = require("./commands/ekstraKomutlar");
let botInstance = null;
function botOlustur() {
    if (botInstance)
        return botInstance;
    const bot = new node_telegram_bot_api_1.default(config_1.config.telegram.token, { polling: true });
    bot.on('message', async (mesaj) => {
        if (!mesaj.text?.startsWith('/'))
            return;
        await (0, rateLimiter_1.rateLimiter)(bot, mesaj);
    });
    (0, genelKomutlar_1.genelKomutlariniKaydet)(bot);
    (0, gorevKomutlari_1.gorevKomutlariniKaydet)(bot);
    (0, sunucuKomutlari_1.sunucuKomutlariniKaydet)(bot);
    (0, aiKomutlari_1.aiKomutlariniKaydet)(bot);
    (0, nobetKomutlari_1.nobetKomutlariniKaydet)(bot);
    (0, isimHandler_1.isimHandleriniKaydet)(bot);
    (0, replyHandler_1.replyHandleriniKaydet)(bot);
    (0, voiceHandler_1.voiceHandleriniKaydet)(bot);
    (0, inlineHandler_1.inlineHandleriniKaydet)(bot);
    (0, ekstraKomutlar_1.ekstraKomutlariniKaydet)(bot);
    bot.on('polling_error', (hata) => logger_1.logger.error('Telegram polling hatası:', hata));
    bot.on('error', (hata) => logger_1.logger.error('Telegram bot hatası:', hata));
    logger_1.logger.info('✅ Telegram botu başlatıldı');
    botInstance = bot;
    return bot;
}
function botAl() {
    return botInstance;
}
async function grupaMesajGonder(metin, parseMode = 'Markdown') {
    const bot = botAl();
    if (!bot)
        return;
    try {
        await bot.sendMessage(config_1.config.telegram.chatId, metin, { parse_mode: parseMode });
    }
    catch (hata) {
        logger_1.logger.error('Grup mesajı gönderilemedi:', hata);
    }
}
//# sourceMappingURL=index.js.map