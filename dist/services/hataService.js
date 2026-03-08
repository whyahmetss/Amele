"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hataService = void 0;
const database_1 = require("../models/database");
const logger_1 = require("../utils/logger");
exports.hataService = {
    async kaydet(veri) {
        const sonuc = await database_1.db.query(`INSERT INTO hata_loglari (servis, endpoint, hata_mesaji, stack_trace, onem)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`, [veri.servis, veri.endpoint, veri.hata_mesaji, veri.stack_trace, veri.onem || 'orta']);
        logger_1.logger.error(`API Hatası kaydedildi: ${veri.servis}${veri.endpoint}`);
        return sonuc.rows[0];
    },
    async gunlukSayim() {
        const sonuc = await database_1.db.query(`SELECT COUNT(*) as sayim FROM hata_loglari WHERE DATE(olusturuldu) = CURRENT_DATE`);
        return parseInt(sonuc.rows[0]?.sayim || '0');
    },
    formatMesaj(hata) {
        const onemIkon = {
            dusuk: '🟡',
            orta: '🟠',
            yuksek: '🔴',
            kritik: '🚨',
        };
        const ikon = onemIkon[hata.onem || 'orta'] || '⚠️';
        const tarih = new Date().toLocaleString('tr-TR');
        return (`${ikon} *API HATASI*\n\n` +
            `🔧 Servis: \`${hata.servis || '-'}\`\n` +
            `📍 Endpoint: \`${hata.endpoint || '-'}\`\n` +
            `💥 Hata: ${hata.hata_mesaji || '-'}\n` +
            `⚡ Önem: ${(hata.onem || 'orta').toUpperCase()}\n` +
            `🕐 Saat: ${tarih}`);
    },
};
//# sourceMappingURL=hataService.js.map