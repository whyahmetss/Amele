import { Request, Response, Router } from 'express';
import { hataService } from '../services/hataService';
import { grupaMesajGonder } from '../bot';
import { config } from '../config';
import { logger } from '../utils/logger';

export const internalRouter = Router();

/**
 * API key doğrulama middleware
 */
function apiKeyDogrula(req: Request, res: Response, next: Function): void {
  const apiKey = req.headers['x-api-key'];
  if (!config.security.internalApiKey || apiKey === config.security.internalApiKey) {
    next();
    return;
  }
  logger.warn(`Yetkisiz internal API erişimi: ${req.ip}`);
  res.status(401).json({ hata: 'Geçersiz API anahtarı' });
}

/**
 * POST /internal/error-log
 * Backend'den hata bildirimi alır, DB'ye yazar, gruba bildirir
 */
internalRouter.post('/error-log', apiKeyDogrula, async (req: Request, res: Response) => {
  const { servis, endpoint, hata_mesaji, stack_trace, onem } = req.body;

  if (!servis || !hata_mesaji) {
    res.status(400).json({ hata: 'servis ve hata_mesaji zorunludur' });
    return;
  }

  try {
    const hata = await hataService.kaydet({
      servis,
      endpoint: endpoint || '-',
      hata_mesaji,
      stack_trace,
      onem: onem || 'orta',
    });

    await grupaMesajGonder(hataService.formatMesaj(hata));

    res.json({ ok: true, id: hata.id });
  } catch (err) {
    logger.error('Error log endpoint hatası:', err);
    res.status(500).json({ hata: 'Kaydedilemedi' });
  }
});

/**
 * GET /internal/saglik
 * Sistem sağlık durumu
 */
internalRouter.get('/saglik', (_req: Request, res: Response) => {
  res.json({
    durum: 'ok',
    zaman: new Date().toISOString(),
    pid: process.pid,
    bellek: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    sureSaniye: Math.floor(process.uptime()),
  });
});
