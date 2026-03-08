import { db } from '../models/database';
import { logger } from '../utils/logger';

export type AuditIslem =
  | 'gorev_eklendi' | 'gorev_bitti' | 'gorev_silindi' | 'gorev_atandi'
  | 'bug_eklendi' | 'deploy_tetiklendi' | 'restart_tetiklendi'
  | 'nobet_atandi' | 'webhook_eklendi';

export const auditService = {
  async kaydet(kullaniciId: number, kullaniciAd: string, islem: AuditIslem, detay?: string, hedefTip?: string, hedefId?: number): Promise<void> {
    try {
      await db.query(
        `INSERT INTO audit_log (kullanici_id, kullanici_ad, islem, detay, hedef_tip, hedef_id) VALUES ($1,$2,$3,$4,$5,$6)`,
        [kullaniciId, kullaniciAd, islem, detay || null, hedefTip || null, hedefId || null]
      );
    } catch (hata) {
      logger.error('Audit kayıt hatası:', hata);
    }
  },

  async sonKayitlar(limit = 15): Promise<Array<{ islem: string; kullanici_ad: string; detay: string; olusturuldu: Date }>> {
    const r = await db.query(`SELECT islem, kullanici_ad, detay, olusturuldu FROM audit_log ORDER BY olusturuldu DESC LIMIT $1`, [limit]);
    return r.rows as any[];
  },
};
