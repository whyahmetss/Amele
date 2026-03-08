"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiKomutlariniKaydet = aiKomutlariniKaydet;
const claudeAI_1 = require("../../integrations/claudeAI");
const bugService_1 = require("../../services/bugService");
const config_1 = require("../../config");
const logger_1 = require("../../utils/logger");
function aiKomutlariniKaydet(bot) {
    // /ai <soru>
    bot.onText(/^\/ai (.+)/i, async (mesaj, eslesme) => {
        const soru = eslesme?.[1]?.trim();
        if (!soru) {
            bot.sendMessage(mesaj.chat.id, '⚠️ Soru yazın.\nKullanım: `/ai Redis nasıl kullanılır?`', { parse_mode: 'Markdown' });
            return;
        }
        const bekliyorMesaji = await bot.sendMessage(mesaj.chat.id, '🤖 Düşünüyorum...');
        try {
            const yanit = await (0, claudeAI_1.claudeSor)(soru);
            await bot.deleteMessage(mesaj.chat.id, bekliyorMesaji.message_id);
            bot.sendMessage(mesaj.chat.id, `🤖 *AI Yanıtı*\n\n${yanit}`, { parse_mode: 'Markdown' });
        }
        catch (hata) {
            logger_1.logger.error('AI komut hatası:', hata);
            bot.sendMessage(mesaj.chat.id, '❌ AI yanıt veremedi.');
        }
    });
    // /bug <açıklama> - Deepseek ile severity analizi
    bot.onText(/^\/bug (.+)/i, async (mesaj, eslesme) => {
        const aciklama = eslesme?.[1]?.trim();
        const ad = mesaj.from?.first_name || 'Bilinmeyen';
        const id = mesaj.from?.id || 0;
        if (!aciklama) {
            bot.sendMessage(mesaj.chat.id, '⚠️ Açıklama yazın.\nKullanım: `/bug Login iOS\'ta çalışmıyor`', { parse_mode: 'Markdown' });
            return;
        }
        try {
            const bug = await bugService_1.bugService.ekle(aciklama, id, ad);
            // Deepseek ile severity analizi
            const analiz = await (0, claudeAI_1.claudeSor)(`Bu bug raporunu değerlendir ve şu formatta yanıt ver (başka hiçbir şey yazma):
SEVERITY: [KRİTİK/YÜKSEK/ORTA/DÜŞÜK]
ÖZET: [1 cümle özet]
ÖNLEM: [1 cümle önerilen aksiyon]

Bug: "${aciklama}"`);
            const seviye = analiz.includes('KRİTİK') ? '🔴 KRİTİK' :
                analiz.includes('YÜKSEK') ? '🟠 YÜKSEK' :
                    analiz.includes('ORTA') ? '🟡 ORTA' : '🟢 DÜŞÜK';
            const mesajMetni = `🐞 *Bug Raporu #${bug.id}*\n\n` +
                `👤 Bildiren: ${ad}\n` +
                `📝 Açıklama: ${aciklama}\n` +
                `${seviye}\n\n` +
                `🤖 *AI Analizi:*\n${analiz}`;
            const opts = { parse_mode: 'Markdown' };
            if (config_1.config.github.token && config_1.config.github.repo) {
                opts.reply_markup = {
                    inline_keyboard: [[{ text: "🔗 GitHub'a Gönder", callback_data: `github:bug:${bug.id}` }]],
                };
            }
            bot.sendMessage(mesaj.chat.id, mesajMetni, opts);
            // KRİTİK ise adminleri mention et
            if (analiz.includes('KRİTİK')) {
                for (const adminId of config_1.config.telegram.adminIds) {
                    try {
                        bot.sendMessage(adminId, `🚨 *KRİTİK BUG!* #${bug.id}\n\n${aciklama}\n\nHemen incele!`, { parse_mode: 'Markdown' });
                    }
                    catch { }
                }
            }
        }
        catch (hata) {
            logger_1.logger.error('Bug raporu hatası:', hata);
            bot.sendMessage(mesaj.chat.id, '❌ Bug raporu kaydedilemedi.');
        }
    });
    // /sinyal <yön> <sembol>
    bot.onText(/^\/sinyal (LONG|SHORT) (.+)/i, async (mesaj, eslesme) => {
        const yon = eslesme?.[1]?.toUpperCase();
        const sembol = eslesme?.[2]?.toUpperCase().trim();
        if (!yon || !sembol) {
            bot.sendMessage(mesaj.chat.id, '⚠️ Kullanım: `/sinyal LONG BTC`', { parse_mode: 'Markdown' });
            return;
        }
        const ikon = yon === 'LONG' ? '📈' : '📉';
        bot.sendMessage(mesaj.chat.id, `${ikon} *${yon} ${sembol}*\n\n` +
            `📍 Entry: —\n🎯 TP: —\n🛑 SL: —\n⚠️ Risk: —\n\n` +
            `_Seviyeleri kendiniz ekleyebilirsiniz._`, { parse_mode: 'Markdown' });
    });
}
//# sourceMappingURL=aiKomutlari.js.map