"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubWebhookRouter = void 0;
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config");
const deployService_1 = require("../services/deployService");
const bot_1 = require("../bot");
const logger_1 = require("../utils/logger");
exports.githubWebhookRouter = (0, express_1.Router)();
/**
 * GitHub imzasını doğrula
 */
function imzaDogrula(payload, imza) {
    if (!config_1.config.github.webhookSecret)
        return true; // Geliştirme modunda geç
    const beklenen = `sha256=${crypto_1.default
        .createHmac('sha256', config_1.config.github.webhookSecret)
        .update(payload)
        .digest('hex')}`;
    return crypto_1.default.timingSafeEqual(Buffer.from(imza), Buffer.from(beklenen));
}
exports.githubWebhookRouter.post('/github', async (req, res) => {
    const imza = req.headers['x-hub-signature-256'];
    const olay = req.headers['x-github-event'];
    const payload = JSON.stringify(req.body);
    // İmza doğrulama
    if (imza && !imzaDogrula(payload, imza)) {
        logger_1.logger.warn('GitHub webhook imza doğrulama başarısız');
        res.status(401).json({ hata: 'Geçersiz imza' });
        return;
    }
    logger_1.logger.info(`GitHub webhook alındı: ${olay}`);
    try {
        // Push olayı
        if (olay === 'push') {
            const { repository, head_commit, pusher, ref } = req.body;
            const branch = ref?.replace('refs/heads/', '') || 'main';
            const commitMesaj = head_commit?.message || '-';
            const commitSha = head_commit?.id?.slice(0, 7) || '-';
            // DB'ye kaydet
            await deployService_1.deployService.kaydet({
                proje: repository?.name || 'UstaGo',
                branch,
                commit_sha: commitSha,
                commit_msg: commitMesaj,
                yapan: pusher?.name || '-',
                durum: 'basliyor',
            });
            // Gruba bildir
            await (0, bot_1.grupaMesajGonder)(`⏳ *Deploy Başladı*\n\n` +
                `📦 Proje: \`${repository?.name || 'UstaGo'}\`\n` +
                `🌿 Branch: \`${branch}\`\n` +
                `💬 Commit: ${commitMesaj.slice(0, 80)}\n` +
                `🔖 SHA: \`${commitSha}\`\n` +
                `👤 Yapan: ${pusher?.name || '-'}\n` +
                `🕐 Saat: ${new Date().toLocaleString('tr-TR')}`);
        }
        // Deployment status olayı (Render veya başka CI entegrasyonu)
        if (olay === 'deployment_status') {
            const durum = req.body.deployment_status?.state;
            const ortam = req.body.deployment_status?.environment;
            if (durum === 'success') {
                await (0, bot_1.grupaMesajGonder)(`🚀 *Deploy Başarılı*\n\n` +
                    `📦 Proje: UstaGo\n` +
                    `🌍 Ortam: ${ortam || 'production'}\n` +
                    `🕐 Saat: ${new Date().toLocaleString('tr-TR')}`);
            }
            else if (durum === 'failure' || durum === 'error') {
                await (0, bot_1.grupaMesajGonder)(`❌ *Deploy Başarısız*\n\n` +
                    `📦 Proje: UstaGo\n` +
                    `🌍 Ortam: ${ortam || 'production'}\n` +
                    `❓ Durum: ${durum}\n` +
                    `🕐 Saat: ${new Date().toLocaleString('tr-TR')}`);
            }
        }
        res.json({ ok: true });
    }
    catch (hata) {
        logger_1.logger.error('GitHub webhook işleme hatası:', hata);
        res.status(500).json({ hata: 'İşleme hatası' });
    }
});
//# sourceMappingURL=github.js.map