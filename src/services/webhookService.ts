import axios from 'axios';
import { db } from '../models/database';
import { logger } from '../utils/logger';

export const webhookService = {
  async tetikle(olay: string, veri: Record<string, any>): Promise<void> {
    try {
      const r = await db.query<{ url: string; olaylar: string[] }>(
        `SELECT url, olaylar FROM webhooklar WHERE aktif = true`
      );
      for (const wh of r.rows) {
        if (!wh.olaylar.includes(olay)) continue;
        try {
          await axios.post(wh.url, { olay, veri, zaman: new Date().toISOString() }, { timeout: 5000 });
        } catch (e: any) {
          logger.warn(`Webhook başarısız ${wh.url}: ${e.message}`);
        }
      }
    } catch (hata) {
      logger.error('Webhook tetikleme hatası:', hata);
    }
  },

  async ekle(url: string, olaylar?: string[]): Promise<number | null> {
    try {
      const r = await db.query<{ id: number }>(
        `INSERT INTO webhooklar (url, olaylar) VALUES ($1, $2) RETURNING id`,
        [url, olaylar || ['gorev_eklendi', 'gorev_bitti', 'bug_eklendi']]
      );
      return r.rows[0]?.id || null;
    } catch (hata) {
      logger.error('Webhook ekleme hatası:', hata);
      return null;
    }
  },

  async liste(): Promise<Array<{ id: number; url: string; olaylar: string[]; aktif: boolean }>> {
    const r = await db.query(`SELECT id, url, olaylar, aktif FROM webhooklar ORDER BY id`);
    return r.rows as any[];
  },

  async sil(id: number): Promise<boolean> {
    const r = await db.query(`DELETE FROM webhooklar WHERE id = $1`, [id]);
    return (r.rowCount ?? 0) > 0;
  },
};
