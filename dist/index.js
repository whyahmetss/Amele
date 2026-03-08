"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const database_1 = require("./models/database");
const redis_1 = require("./models/redis");
const bot_1 = require("./bot");
const github_1 = require("./webhooks/github");
const internal_1 = require("./routes/internal");
const gunlukRapor_1 = require("./jobs/gunlukRapor");
async function basla() {
    logger_1.logger.info('🚀 UstaGo Bot başlatılıyor...');
    // Redis bağlantısı
    try {
        await redis_1.redis.baglan();
        logger_1.logger.info('✅ Redis bağlandı');
    }
    catch (hata) {
        logger_1.logger.warn('⚠️ Redis bağlanamadı, devam ediliyor:', hata);
    }
    // Express sunucusu
    const uygulama = (0, express_1.default)();
    uygulama.use(express_1.default.json({
        verify: (req, _res, buf) => {
            req.rawBody = buf.toString(); // GitHub imzası için
        }
    }));
    uygulama.use(express_1.default.urlencoded({ extended: true }));
    // Sağlık endpoint'i
    uygulama.get('/', (_req, res) => {
        res.json({
            servis: 'UstaGo Bot',
            durum: 'çalışıyor',
            zaman: new Date().toISOString(),
        });
    });
    // Webhook ve internal rotalar
    uygulama.use('/webhook', github_1.githubWebhookRouter);
    uygulama.use('/internal', internal_1.internalRouter);
    // 404 handler
    uygulama.use((_req, res) => {
        res.status(404).json({ hata: 'Bulunamadı' });
    });
    // Hata handler
    uygulama.use((hata, _req, res, _next) => {
        logger_1.logger.error('Express hatası:', hata);
        res.status(500).json({ hata: 'Sunucu hatası' });
    });
    // Sunucuyu başlat
    uygulama.listen(config_1.config.server.port, () => {
        logger_1.logger.info(`✅ Express sunucu: http://localhost:${config_1.config.server.port}`);
    });
    // Telegram botunu başlat
    (0, bot_1.botOlustur)();
    // Cron jobları başlat
    (0, gunlukRapor_1.gunlukRaporuBaslat)();
    logger_1.logger.info('✅ UstaGo Bot tamamen çalışıyor!');
}
// Beklenmeyen hata yakalama
process.on('unhandledRejection', (sebep) => {
    logger_1.logger.error('İşlenmeyen Promise reddi:', sebep);
});
process.on('uncaughtException', (hata) => {
    logger_1.logger.error('Beklenmeyen hata:', hata);
    process.exit(1);
});
// Temiz kapatma
process.on('SIGTERM', async () => {
    logger_1.logger.info('SIGTERM alındı, kapatılıyor...');
    await database_1.db.end();
    process.exit(0);
});
basla().catch((hata) => {
    logger_1.logger.error('Başlatma hatası:', hata);
    process.exit(1);
});
//# sourceMappingURL=index.js.map