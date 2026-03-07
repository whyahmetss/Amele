import express from 'express';
import { config } from './config';
import { logger } from './utils/logger';
import { db } from './models/database';
import { redis } from './models/redis';
import { botOlustur } from './bot';
import { githubWebhookRouter } from './webhooks/github';
import { internalRouter } from './routes/internal';
import { gunlukRaporuBaslat } from './jobs/gunlukRapor';

async function basla(): Promise<void> {
  logger.info('🚀 UstaGo Bot başlatılıyor...');

  // Redis bağlantısı
  try {
    await redis.baglan();
    logger.info('✅ Redis bağlandı');
  } catch (hata) {
    logger.warn('⚠️ Redis bağlanamadı, devam ediliyor:', hata);
  }

  // Express sunucusu
  const uygulama = express();

  uygulama.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString(); // GitHub imzası için
    }
  }));

  uygulama.use(express.urlencoded({ extended: true }));

  // Sağlık endpoint'i
  uygulama.get('/', (_req, res) => {
    res.json({
      servis: 'UstaGo Bot',
      durum: 'çalışıyor',
      zaman: new Date().toISOString(),
    });
  });

  // Webhook ve internal rotalar
  uygulama.use('/webhook', githubWebhookRouter);
  uygulama.use('/internal', internalRouter);

  // 404 handler
  uygulama.use((_req, res) => {
    res.status(404).json({ hata: 'Bulunamadı' });
  });

  // Hata handler
  uygulama.use((hata: Error, _req: any, res: any, _next: any) => {
    logger.error('Express hatası:', hata);
    res.status(500).json({ hata: 'Sunucu hatası' });
  });

  // Sunucuyu başlat
  uygulama.listen(config.server.port, () => {
    logger.info(`✅ Express sunucu: http://localhost:${config.server.port}`);
  });

  // Telegram botunu başlat
  botOlustur();

  // Cron jobları başlat
  gunlukRaporuBaslat();

  logger.info('✅ UstaGo Bot tamamen çalışıyor!');
}

// Beklenmeyen hata yakalama
process.on('unhandledRejection', (sebep) => {
  logger.error('İşlenmeyen Promise reddi:', sebep);
});

process.on('uncaughtException', (hata) => {
  logger.error('Beklenmeyen hata:', hata);
  process.exit(1);
});

// Temiz kapatma
process.on('SIGTERM', async () => {
  logger.info('SIGTERM alındı, kapatılıyor...');
  await db.end();
  process.exit(0);
});

basla().catch((hata) => {
  logger.error('Başlatma hatası:', hata);
  process.exit(1);
});
