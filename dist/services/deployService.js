"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployService = void 0;
const axios_1 = __importDefault(require("axios"));
const database_1 = require("../models/database");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
exports.deployService = {
    async kaydet(veri) {
        const sonuc = await database_1.db.query(`INSERT INTO deployler (proje, branch, commit_sha, commit_msg, yapan, durum)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [veri.proje || 'UstaGo', veri.branch, veri.commit_sha, veri.commit_msg, veri.yapan, veri.durum]);
        return sonuc.rows[0];
    },
    async guncelle(id, durum) {
        await database_1.db.query(`UPDATE deployler SET durum = $1 WHERE id = $2`, [durum, id]);
    },
    async son(limit = 5) {
        const sonuc = await database_1.db.query(`SELECT * FROM deployler ORDER BY olusturuldu DESC LIMIT $1`, [limit]);
        return sonuc.rows;
    },
    async tetikle() {
        if (!config_1.config.deploy.renderHook) {
            logger_1.logger.warn('Render deploy hook tanımlanmamış');
            return false;
        }
        try {
            await axios_1.default.post(config_1.config.deploy.renderHook);
            logger_1.logger.info('Deploy tetiklendi (Render)');
            return true;
        }
        catch (hata) {
            logger_1.logger.error('Deploy tetikleme hatası:', hata);
            return false;
        }
    },
    formatMesaj(deploy, durum) {
        const ikonlar = {
            basliyor: '⏳',
            basarili: '🚀',
            basarisiz: '❌',
        };
        const ikon = ikonlar[deploy.durum || ''] || '🔄';
        const tarih = new Date().toLocaleString('tr-TR');
        return (`${ikon} *Deploy ${durum}*\n\n` +
            `📦 Proje: \`${deploy.proje || 'UstaGo'}\`\n` +
            `🌿 Branch: \`${deploy.branch || '-'}\`\n` +
            `💬 Commit: ${deploy.commit_msg || '-'}\n` +
            `👤 Yapan: ${deploy.yapan || '-'}\n` +
            `🕐 Saat: ${tarih}`);
    },
};
//# sourceMappingURL=deployService.js.map