"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bugService = void 0;
const database_1 = require("../models/database");
const logger_1 = require("../utils/logger");
exports.bugService = {
    async ekle(aciklama, kullaniciId, kullaniciAd) {
        const sonuc = await database_1.db.query(`INSERT INTO bug_raporlari (aciklama, bildiren_id, bildiren_ad)
       VALUES ($1, $2, $3) RETURNING *`, [aciklama, kullaniciId, kullaniciAd]);
        logger_1.logger.info(`Bug raporu eklendi: "${aciklama.slice(0, 50)}" — ${kullaniciAd}`);
        return sonuc.rows[0];
    },
    async liste(durum) {
        if (durum) {
            const sonuc = await database_1.db.query(`SELECT * FROM bug_raporlari WHERE durum = $1 ORDER BY olusturuldu DESC`, [durum]);
            return sonuc.rows;
        }
        const sonuc = await database_1.db.query(`SELECT * FROM bug_raporlari WHERE durum != 'cozuldu' ORDER BY olusturuldu DESC LIMIT 10`);
        return sonuc.rows;
    },
    async gunlukSayim() {
        const sonuc = await database_1.db.query(`SELECT COUNT(*) as sayim FROM bug_raporlari WHERE DATE(olusturuldu) = CURRENT_DATE`);
        return parseInt(sonuc.rows[0]?.sayim || '0');
    },
    formatMesaj(bug) {
        const tarih = new Date(bug.olusturuldu).toLocaleString('tr-TR');
        return (`🐞 *Bug Raporu #${bug.id}*\n\n` +
            `👤 Bildiren: ${bug.bildiren_ad}\n` +
            `📝 Açıklama: ${bug.aciklama}\n` +
            `📊 Durum: ${bug.durum.toUpperCase()}\n` +
            `🕐 Saat: ${tarih}`);
    },
};
//# sourceMappingURL=bugService.js.map