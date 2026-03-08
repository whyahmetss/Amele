"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nobetKomutlariniKaydet = nobetKomutlariniKaydet;
const nobetService_1 = require("../../services/nobetService");
const auth_1 = require("../middlewares/auth");
function nobetKomutlariniKaydet(bot) {
    // /nobet - Bugünkü nöbetçiyi göster
    bot.onText(/^\/nobet$/i, async (mesaj) => {
        try {
            const nobet = await nobetService_1.nobetService.bugunGetir();
            if (!nobet) {
                bot.sendMessage(mesaj.chat.id, '📅 Bugün için nöbet atanmamış.');
                return;
            }
            bot.sendMessage(mesaj.chat.id, `👮 *Bugünkü Nöbetçi*\n\n🕐 ${nobet.tarih}\n👤 ${nobet.kullanici_ad}`, { parse_mode: 'Markdown' });
        }
        catch {
            bot.sendMessage(mesaj.chat.id, '❌ Nöbet bilgisi alınamadı.');
        }
    });
    // /nobet haftalik - Bu haftanın nöbet listesi
    bot.onText(/^\/nobet haftal[iı]k/i, async (mesaj) => {
        try {
            const list = await nobetService_1.nobetService.haftalikGetir();
            if (!list.length) {
                bot.sendMessage(mesaj.chat.id, '📅 Bu hafta nöbet atanmamış.');
                return;
            }
            const satirlar = list.map((n) => `📅 ${n.tarih} → ${n.kullanici_ad}`).join('\n');
            bot.sendMessage(mesaj.chat.id, `📋 *Haftalık Nöbet*\n\n${satirlar}`, { parse_mode: 'Markdown' });
        }
        catch {
            bot.sendMessage(mesaj.chat.id, '❌ Nöbet listesi alınamadı.');
        }
    });
    // /nobet ata <tarih> - Sadece admin
    bot.onText(/^\/nobet ata (.+)$/i, async (mesaj, eslesme) => {
        const uid = mesaj.from?.id;
        if (!uid || !(0, auth_1.adminMi)(uid)) {
            bot.sendMessage(mesaj.chat.id, '🚫 Sadece adminler nöbet atayabilir.');
            return;
        }
        const tarihStr = eslesme?.[1]?.trim();
        const ad = mesaj.from?.first_name || 'Bilinmeyen';
        const parseTarih = (s) => {
            const bugun = new Date();
            if (/^(\d{4})-(\d{2})-(\d{2})$/.test(s))
                return s;
            if (s === 'bugün' || s === 'bugun')
                return bugun.toISOString().split('T')[0];
            if (s === 'yarın' || s === 'yarin') {
                bugun.setDate(bugun.getDate() + 1);
                return bugun.toISOString().split('T')[0];
            }
            const d = new Date(s);
            return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
        };
        const tarih = tarihStr ? parseTarih(tarihStr) : new Date().toISOString().split('T')[0];
        if (!tarih) {
            bot.sendMessage(mesaj.chat.id, '⚠️ Geçerli tarih girin. Örn: 2025-03-10, bugün, yarın');
            return;
        }
        const kayit = await nobetService_1.nobetService.ekle(uid, ad, tarih);
        if (kayit) {
            bot.sendMessage(mesaj.chat.id, `✅ Nöbet atandı: ${tarih} → ${ad}`);
        }
        else {
            bot.sendMessage(mesaj.chat.id, '❌ Nöbet atanamadı.');
        }
    });
}
//# sourceMappingURL=nobetKomutlari.js.map