import { createClient } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';

const istemci = createClient({ url: config.redis.url });

istemci.on('error', (hata: any) => logger.error('Redis hatası:', hata));
istemci.on('connect', () => logger.info('Redis bağlantısı kuruldu'));

class RedisIstemci {
  async baglan(): Promise<void> {
    if (!istemci.isOpen) {
      await istemci.connect();
    }
  }

  async al(anahtar: string): Promise<string | null> {
    return await istemci.get(anahtar);
  }

  async kaydet(anahtar: string, deger: string, ttlSaniye?: number): Promise<void> {
    if (ttlSaniye) {
      await istemci.setEx(anahtar, ttlSaniye, deger);
    } else {
      await istemci.set(anahtar, deger);
    }
  }

  async sil(anahtar: string): Promise<void> {
    await istemci.del(anahtar);
  }

  async artir(anahtar: string): Promise<number> {
    return await istemci.incr(anahtar);
  }

  async ttlAyarla(anahtar: string, saniye: number): Promise<void> {
    await istemci.expire(anahtar, saniye);
  }

  async saglik(): Promise<boolean> {
    try {
      await istemci.ping();
      return true;
    } catch {
      return false;
    }
  }
}

export const redis = new RedisIstemci();
