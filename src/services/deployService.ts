import axios from 'axios';
import { db } from '../models/database';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface Deploy {
  id: number;
  proje: string;
  branch: string;
  commit_sha: string;
  commit_msg: string;
  yapan: string;
  durum: 'basliyor' | 'basarili' | 'basarisiz';
  olusturuldu: Date;
}

export const deployService = {
  async kaydet(veri: Partial<Deploy>): Promise<Deploy> {
    const sonuc = await db.query<Deploy>(
      `INSERT INTO deployler (proje, branch, commit_sha, commit_msg, yapan, durum)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [veri.proje || 'UstaGo', veri.branch, veri.commit_sha, veri.commit_msg, veri.yapan, veri.durum]
    );
    return sonuc.rows[0];
  },

  async guncelle(id: number, durum: Deploy['durum']): Promise<void> {
    await db.query(
      `UPDATE deployler SET durum = $1 WHERE id = $2`,
      [durum, id]
    );
  },

  async son(limit = 5): Promise<Deploy[]> {
    const sonuc = await db.query<Deploy>(
      `SELECT * FROM deployler ORDER BY olusturuldu DESC LIMIT $1`,
      [limit]
    );
    return sonuc.rows;
  },

  async tetikle(): Promise<boolean> {
    if (!config.deploy.renderHook) {
      logger.warn('Render deploy hook tanımlanmamış');
      return false;
    }
    try {
      await axios.post(config.deploy.renderHook);
      logger.info('Deploy tetiklendi (Render)');
      return true;
    } catch (hata) {
      logger.error('Deploy tetikleme hatası:', hata);
      return false;
    }
  },

  formatMesaj(deploy: Partial<Deploy>, durum: string): string {
    const ikonlar: Record<string, string> = {
      basliyor: '⏳',
      basarili: '🚀',
      basarisiz: '❌',
    };
    const ikon = ikonlar[deploy.durum || ''] || '🔄';
    const tarih = new Date().toLocaleString('tr-TR');

    return (
      `${ikon} *Deploy ${durum}*\n\n` +
      `📦 Proje: \`${deploy.proje || 'UstaGo'}\`\n` +
      `🌿 Branch: \`${deploy.branch || '-'}\`\n` +
      `💬 Commit: ${deploy.commit_msg || '-'}\n` +
      `👤 Yapan: ${deploy.yapan || '-'}\n` +
      `🕐 Saat: ${tarih}`
    );
  },
};
