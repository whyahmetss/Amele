"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nobetService = void 0;
const database_1 = require("../models/database");
const logger_1 = require("../utils/logger");
exports.nobetService = {
    async ekle(kullaniciId, kullaniciAd, tarih) {
        const gun = tarih || new Date().toISOString().split('T')[0];
        try {
            const sonuc = await database_1.db.query(`INSERT INTO nobet_takvimi (kullanici_id, kullanici_ad, tarih)
         VALUES ($1, $2, $3)
         ON CONFLICT (tarih) DO UPDATE SET kullanici_id = $1, kullanici_ad = $2
         RETURNING *`, [kullaniciId, kullaniciAd, gun]);
            logger_1.logger.info(`Nöbet atandı: ${gun} → ${kullaniciAd}`);
            return sonuc.rows[0];
        }
        catch (hata) {
            logger_1.logger.error('Nöbet ekleme hatası:', hata);
            return null;
        }
    },
    async bugunGetir() {
        const bugun = new Date().toISOString().split('T')[0];
        const sonuc = await database_1.db.query(`SELECT * FROM nobet_takvimi WHERE tarih = $1`, [bugun]);
        return sonuc.rows[0] || null;
    },
    async haftalikGetir() {
        const sonuc = await database_1.db.query(`SELECT * FROM nobet_takvimi
       WHERE tarih >= CURRENT_DATE AND tarih < CURRENT_DATE + INTERVAL '7 days'
       ORDER BY tarih ASC`);
        return sonuc.rows;
    },
};
//# sourceMappingURL=nobetService.js.map