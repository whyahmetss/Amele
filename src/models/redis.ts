import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';

class RedisIstemci {
  private istemci: RedisClientType;
  private bagli: boolean = false;

  constructor() {
    this.istemci = createClient({ url: config.redis.url }) as RedisClientType;

    this.istemci.on('error', (hata) => logger.error('Redis hatası:', hata));
    this.istemci.on('connect', () => {
      this.bagli = true;
      logger.info('Redis bağlantısı kuruldu');
    });
    this.istemci.on('disconnect', () => {
      this.bagli = false;
      logger.warn('Redis bağlantısı kesildi');
    });
  }

  async baglan(): Promise<void> {
    if (!this.bagli) {
      await this.istemci.connect();
    }
  }

  async al(anahtar: string): Promise<string | null> {
    return await this.istemci.get(anahtar);
  }

  async kaydet(anahtar: string, deger: string, ttlSaniye?: number): Promise<void> {
    if (ttlSaniye) {
      await this.istemci.setEx(anahtar, ttlSaniye, deger);
    } else {
      await this.istemci.set(anahtar, deger);
    }
  }

  async sil(anahtar: string): Promise<void> {
    await this.istemci.del(anahtar);
  }

  async artir(anahtar: string): Promise<number> {
    return await this.istemci.incr(anahtar);
  }

  async ttlAyarla(anahtar: string, saniye: number): Promise<void> {
    await this.istemci.expire(anahtar, saniye);
  }

  async saglik(): Promise<boolean> {
    try {
      await this.istemci.ping();
      return true;
    } catch {
      return false;
    }
  }
}

export const redis = new RedisIstemci();
