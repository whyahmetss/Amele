"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.gorevKomutlariniKaydet = gorevKomutlariniKaydet;
const gorevService_1 = require("../../services/gorevService");
const logger_1 = require("../../utils/logger");
const config_1 = require("../../config");
function gorevKomutlariniKaydet(bot) {
    // /gorev dogal "Yarın Login API düzelt" - AI parse edip görev oluşturur
    bot.onText(/^\/gorev dogal (.+)/i, async (mesaj, eslesme) => {
        const metin = eslesme?.[1]?.trim();
        const ad = mesaj.from?.first_name || 'Bilinmeyen';
        const id = mesaj.from?.id || 0;
        if (!metin) {
            bot.sendMessage(mesaj.chat.id, '⚠️ Kullanım: `/gorev dogal Yarın Login API düzelt`', { parse_mode: 'Markdown' });
            return;
        }
        try {
            const { claudeSor } = await Promise.resolve().then(() => __importStar(require('../../integrations/claudeAI')));
            const gorevMetni = await claudeSor(`Aşağıdaki metni TEK BİR GÖREV metnine dönüştür. Sadece görev metnini yaz, başka hiçbir şey yazma. Tarih/zaman bilgisini atla.
Örnek: "Yarın sabah Login sayfasını düzelt" → "Login sayfasını düzelt"
Metin: "${metin}"`);
            const gorev = await gorevService_1.gorevService.ekle(gorevMetni.trim(), id, ad);
            bot.sendMessage(mesaj.chat.id, `✅ *Görev eklendi* #${gorev.id}\n\n📌 ${gorev.metin}\n👤 ${ad}`, { parse_mode: 'Markdown' });
        }
        catch (hata) {
            logger_1.logger.error('Doğal dil görev hatası:', hata);
            bot.sendMessage(mesaj.chat.id, '❌ Görev oluşturulamadı.');
        }
    });
    // /gorev ekle <metin>
    bot.onText(/^\/gorev ekle (.+)/i, async (mesaj, eslesme) => {
        const metin = eslesme?.[1]?.trim();
        const ad = mesaj.from?.first_name || 'Bilinmeyen';
        const id = mesaj.from?.id || 0;
        if (!metin) {
            bot.sendMessage(mesaj.chat.id, '⚠️ Görev metni boş olamaz.\nKullanım: `/gorev ekle Login API düzelt`', { parse_mode: 'Markdown' });
            return;
        }
        try {
            const gorev = await gorevService_1.gorevService.ekle(metin, id, ad);
            const opts = { parse_mode: 'Markdown' };
            if (config_1.config.github.token && config_1.config.github.repo) {
                opts.reply_markup = {
                    inline_keyboard: [[{ text: "🔗 GitHub'a Gönder", callback_data: `github:gorev:${gorev.id}` }]],
                };
            }
            bot.sendMessage(mesaj.chat.id, `✅ *Görev eklendi* #${gorev.id}\n\n📌 ${gorev.metin}\n👤 ${ad}`, opts);
        }
        catch (hata) {
            logger_1.logger.error('Görev ekleme hatası:', hata);
            bot.sendMessage(mesaj.chat.id, '❌ Görev eklenemedi. Lütfen tekrar deneyin.');
        }
    });
    // /gorev liste
    bot.onText(/^\/gorev liste/i, async (mesaj) => {
        try {
            const gorevler = await gorevService_1.gorevService.liste();
            const metin = gorevService_1.gorevService.formatListeMesaji(gorevler);
            bot.sendMessage(mesaj.chat.id, metin, { parse_mode: 'Markdown' });
        }
        catch (hata) {
            logger_1.logger.error('Görev liste hatası:', hata);
            bot.sendMessage(mesaj.chat.id, '❌ Görevler listelenemedi.');
        }
    });
    // /gorev bitir <id>
    bot.onText(/^\/gorev bitir (\d+)/i, async (mesaj, eslesme) => {
        const id = parseInt(eslesme?.[1] || '0');
        if (!id) {
            bot.sendMessage(mesaj.chat.id, '⚠️ Geçersiz ID.\nKullanım: `/gorev bitir 3`', { parse_mode: 'Markdown' });
            return;
        }
        try {
            const gorev = await gorevService_1.gorevService.bitir(id);
            if (!gorev) {
                bot.sendMessage(mesaj.chat.id, `❓ #${id} numaralı görev bulunamadı veya zaten tamamlanmış.`);
                return;
            }
            bot.sendMessage(mesaj.chat.id, `✅ *Görev tamamlandı* #${gorev.id}\n\n~~${gorev.metin}~~`, { parse_mode: 'Markdown' });
        }
        catch (hata) {
            logger_1.logger.error('Görev bitirme hatası:', hata);
            bot.sendMessage(mesaj.chat.id, '❌ Görev güncellenemedi.');
        }
    });
    // /gorev sil <id>
    bot.onText(/^\/gorev sil (\d+)/i, async (mesaj, eslesme) => {
        const id = parseInt(eslesme?.[1] || '0');
        if (!id) {
            bot.sendMessage(mesaj.chat.id, '⚠️ Geçersiz ID.\nKullanım: `/gorev sil 3`', { parse_mode: 'Markdown' });
            return;
        }
        try {
            const silindi = await gorevService_1.gorevService.sil(id);
            if (!silindi) {
                bot.sendMessage(mesaj.chat.id, `❓ #${id} numaralı görev bulunamadı.`);
                return;
            }
            bot.sendMessage(mesaj.chat.id, `🗑️ Görev #${id} silindi.`);
        }
        catch (hata) {
            logger_1.logger.error('Görev silme hatası:', hata);
            bot.sendMessage(mesaj.chat.id, '❌ Görev silinemedi.');
        }
    });
    // /sprint - Deepseek ile görev analizi
    bot.onText(/^\/sprint/i, async (mesaj) => {
        try {
            const gorevler = await gorevService_1.gorevService.liste();
            if (!gorevler.length) {
                bot.sendMessage(mesaj.chat.id, '📋 Aktif görev yok.');
                return;
            }
            bot.sendMessage(mesaj.chat.id, '🤖 Görevler analiz ediliyor...');
            const gorevListesi = gorevler.map((g) => `#${g.id}: ${g.metin}`).join('\n');
            const { claudeSor } = await Promise.resolve().then(() => __importStar(require('../../integrations/claudeAI')));
            const analiz = await claudeSor(`UstaGo projesi için aşağıdaki görevleri analiz et. Önceliklendirme yap, tahmini süre ver, varsa bağımlılıkları belirt. Kısa ve net ol:\n\n${gorevListesi}`);
            bot.sendMessage(mesaj.chat.id, `🚀 *Sprint Analizi*\n\n${analiz}`, { parse_mode: 'Markdown' });
        }
        catch (hata) {
            logger_1.logger.error('Sprint hatası:', hata);
            bot.sendMessage(mesaj.chat.id, '❌ Sprint analizi yapılamadı.');
        }
    });
}
// Bu satırı sil - append düzgün çalışmıyor
//# sourceMappingURL=gorevKomutlari.js.map