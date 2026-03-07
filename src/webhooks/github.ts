import { Request, Response, Router } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { deployService } from '../services/deployService';
import { grupaMesajGonder } from '../bot';
import { logger } from '../utils/logger';

export const githubWebhookRouter = Router();

/**
 * GitHub imzasını doğrula
 */
function imzaDogrula(payload: string, imza: string): boolean {
  if (!config.github.webhookSecret) return true; // Geliştirme modunda geç
  const beklenen = `sha256=${crypto
    .createHmac('sha256', config.github.webhookSecret)
    .update(payload)
    .digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(imza), Buffer.from(beklenen));
}

githubWebhookRouter.post('/github', async (req: Request, res: Response) => {
  const imza = req.headers['x-hub-signature-256'] as string;
  const olay = req.headers['x-github-event'] as string;
  const payload = JSON.stringify(req.body);

  // İmza doğrulama
  if (imza && !imzaDogrula(payload, imza)) {
    logger.warn('GitHub webhook imza doğrulama başarısız');
    res.status(401).json({ hata: 'Geçersiz imza' });
    return;
  }

  logger.info(`GitHub webhook alındı: ${olay}`);

  try {
    // Push olayı
    if (olay === 'push') {
      const { repository, head_commit, pusher, ref } = req.body;
      const branch = ref?.replace('refs/heads/', '') || 'main';
      const commitMesaj = head_commit?.message || '-';
      const commitSha = head_commit?.id?.slice(0, 7) || '-';

      // DB'ye kaydet
      await deployService.kaydet({
        proje: repository?.name || 'UstaGo',
        branch,
        commit_sha: commitSha,
        commit_msg: commitMesaj,
        yapan: pusher?.name || '-',
        durum: 'basliyor',
      });

      // Gruba bildir
      await grupaMesajGonder(
        `⏳ *Deploy Başladı*\n\n` +
        `📦 Proje: \`${repository?.name || 'UstaGo'}\`\n` +
        `🌿 Branch: \`${branch}\`\n` +
        `💬 Commit: ${commitMesaj.slice(0, 80)}\n` +
        `🔖 SHA: \`${commitSha}\`\n` +
        `👤 Yapan: ${pusher?.name || '-'}\n` +
        `🕐 Saat: ${new Date().toLocaleString('tr-TR')}`
      );
    }

    // Deployment status olayı (Render veya başka CI entegrasyonu)
    if (olay === 'deployment_status') {
      const durum = req.body.deployment_status?.state;
      const ortam = req.body.deployment_status?.environment;

      if (durum === 'success') {
        await grupaMesajGonder(
          `🚀 *Deploy Başarılı*\n\n` +
          `📦 Proje: UstaGo\n` +
          `🌍 Ortam: ${ortam || 'production'}\n` +
          `🕐 Saat: ${new Date().toLocaleString('tr-TR')}`
        );
      } else if (durum === 'failure' || durum === 'error') {
        await grupaMesajGonder(
          `❌ *Deploy Başarısız*\n\n` +
          `📦 Proje: UstaGo\n` +
          `🌍 Ortam: ${ortam || 'production'}\n` +
          `❓ Durum: ${durum}\n` +
          `🕐 Saat: ${new Date().toLocaleString('tr-TR')}`
        );
      }
    }

    res.json({ ok: true });
  } catch (hata) {
    logger.error('GitHub webhook işleme hatası:', hata);
    res.status(500).json({ hata: 'İşleme hatası' });
  }
});
