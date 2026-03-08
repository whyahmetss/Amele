"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isimHandleriniKaydet = isimHandleriniKaydet;
const claudeAI_1 = require("../../integrations/claudeAI");
const logger_1 = require("../../utils/logger");
const TETIKLEYICI_KELIMELER = ['amele', 'amele_bot', '@amele_bot'];
function isimHandleriniKaydet(bot) {
    bot.on('message', async (mesaj) => {
        if (!mesaj.text)
            return;
        if (mesaj.text.startsWith('/'))
            return;
        const metin = mesaj.text.toLowerCase();
        const tetiklendi = TETIKLEYICI_KELIMELER.some(k => metin.includes(k));
        if (!tetiklendi)
            return;
        // İsmi mesajdan çıkar, sadece soruyu al
        let soru = mesaj.text;
        TETIKLEYICI_KELIMELER.forEach(k => {
            soru = soru.replace(new RegExp(k, 'gi'), '').trim();
        });
        if (!soru)
            soru = 'Merhaba! Nasılsın?';
        logger_1.logger.info(`İsim tetiklendi: "${mesaj.text}"`);
        try {
            const yanit = await (0, claudeAI_1.claudeSor)(soru);
            bot.sendMessage(mesaj.chat.id, `🤖 ${yanit}`, {
                reply_to_message_id: mesaj.message_id
            });
        }
        catch (hata) {
            logger_1.logger.error('İsim handler hatası:', hata);
        }
    });
}
//# sourceMappingURL=isimHandler.js.map