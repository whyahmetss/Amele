"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.internalRouter = void 0;
const express_1 = require("express");
const hataService_1 = require("../services/hataService");
const bot_1 = require("../bot");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
exports.internalRouter = (0, express_1.Router)();
/**
 * API key doğrulama middleware
 */
function apiKeyDogrula(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (!config_1.config.security.internalApiKey || apiKey === config_1.config.security.internalApiKey) {
        next();
        return;
    }
    logger_1.logger.warn(`Yetkisiz internal API erişimi: ${req.ip}`);
    res.status(401).json({ hata: 'Geçersiz API anahtarı' });
}
/**
 * POST /internal/error-log
 * Backend'den hata bildirimi alır, DB'ye yazar, gruba bildirir
 */
exports.internalRouter.post('/error-log', apiKeyDogrula, async (req, res) => {
    const { servis, endpoint, hata_mesaji, stack_trace, onem } = req.body;
    if (!servis || !hata_mesaji) {
        res.status(400).json({ hata: 'servis ve hata_mesaji zorunludur' });
        return;
    }
    try {
        const hata = await hataService_1.hataService.kaydet({
            servis,
            endpoint: endpoint || '-',
            hata_mesaji,
            stack_trace,
            onem: onem || 'orta',
        });
        await (0, bot_1.grupaMesajGonder)(hataService_1.hataService.formatMesaj(hata));
        res.json({ ok: true, id: hata.id });
    }
    catch (err) {
        logger_1.logger.error('Error log endpoint hatası:', err);
        res.status(500).json({ hata: 'Kaydedilemedi' });
    }
});
/**
 * GET /internal/saglik
 * Sistem sağlık durumu
 */
exports.internalRouter.get('/saglik', (_req, res) => {
    res.json({
        durum: 'ok',
        zaman: new Date().toISOString(),
        pid: process.pid,
        bellek: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        sureSaniye: Math.floor(process.uptime()),
    });
});
//# sourceMappingURL=internal.js.map