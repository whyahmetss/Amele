import { Pool, QueryResult } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

class Veritabani {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      ...config.db,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: {
    rejectUnauthorized: false // Supabase bağlantısı için bu şart kanka
  }
    });

    this.pool.on('error', (hata) => {
      logger.error('PostgreSQL bağlantı hatası:', hata);
    });
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const istemci = await this.pool.connect();
    try {
      const sonuc = await istemci.query<T>(sql, params);
      return sonuc;
    } catch (hata) {
      logger.error(`SQL Hatası: ${sql}`, hata);
      throw hata;
    } finally {
      istemci.release();
    }
  }

  async end(): Promise<void> {
    await this.pool.end();
  }

  async saglik(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

export const db = new Veritabani();
