"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replyHandleriniKaydet = replyHandleriniKaydet;
const gorevService_1 = require("../../services/gorevService");
const bugService_1 = require("../../services/bugService");
const claudeAI_1 = require("../../integrations/claudeAI");
const logger_1 = require("../../utils/logger");
const config_1 = require("../../config");
/**
 * Mesaja yanıt vererek "gorev" veya "bug" yazınca o mesajı görev/bug olarak ekler
 */
function replyHandleriniKaydet(bot) {
    bot.on('message', async (mesaj) => {
        if (!mesaj.text || !mesaj.reply_to_message)
            return;
        if (mesaj.text.startsWith('/'))
            return;
        const metin = mesaj.text.trim().toLowerCase();
        const hedefMesaj = mesaj.reply_to_message;
        if (!hedefMesaj.text) {
            bot.sendMessage(mesaj.chat.id, '⚠️ Yanıt verdiğiniz mesaj metin içermiyor.');
            return;
        }
        const ad = mesaj.from?.first_name || 'Bilinmeyen';
        const id = mesaj.from?.id || 0;
        if (metin === 'gorev') {
            try {
                const gorev = await gorevService_1.gorevService.ekle(hedefMesaj.text, id, ad);
                await bot.sendMessage(mesaj.chat.id, `✅ *Görev eklendi* #${gorev.id}\n\n📌 ${gorev.metin}\n👤 ${ad}`, { parse_mode: 'Markdown', reply_to_message_id: mesaj.message_id });
            }
            catch (hata) {
                logger_1.logger.error('Reply görev hatası:', hata);
                await bot.sendMessage(mesaj.chat.id, '❌ Görev eklenemedi.');
            }
            return;
        }
        if (metin === 'bug') {
            try {
                const bug = await bugService_1.bugService.ekle(hedefMesaj.text, id, ad);
                const analiz = await (0, claudeAI_1.claudeSor)(`Bu bug raporunu değerlendir. Sadece şu formatta yanıt ver:
SEVERITY: [KRİTİK/YÜKSEK/ORTA/DÜŞÜK]
ÖZET: [1 cümle]
ÖNLEM: [1 cümle]

Bug: "${hedefMesaj.text}"`);
                const seviye = analiz.includes('KRİTİK') ? '🔴 KRİTİK' :
                    analiz.includes('YÜKSEK') ? '🟠 YÜKSEK' :
                        analiz.includes('ORTA') ? '🟡 ORTA' : '🟢 DÜŞÜK';
                await bot.sendMessage(mesaj.chat.id, `🐞 *Bug Raporu #${bug.id}*\n\n👤 ${ad}\n📝 ${hedefMesaj.text}\n${seviye}\n\n🤖 ${analiz}`, { parse_mode: 'Markdown', reply_to_message_id: mesaj.message_id });
                if (analiz.includes('KRİTİK')) {
                    for (const adminId of config_1.config.telegram.adminIds) {
                        try {
                            await bot.sendMessage(adminId, `🚨 *KRİTİK BUG!* #${bug.id}\n\n${hedefMesaj.text}`, { parse_mode: 'Markdown' });
                        }
                        catch { }
                    }
                }
            }
            catch (hata) {
                logger_1.logger.error('Reply bug hatası:', hata);
                await bot.sendMessage(mesaj.chat.id, '❌ Bug raporu eklenemedi.');
            }
            return;
        }
    });
}
//# sourceMappingURL=replyHandler.js.map