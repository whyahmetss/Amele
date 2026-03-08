import axios from 'axios';
import { grupaMesajGonder } from '../bot';
import { logger } from '../utils/logger';

interface ServisDetay {
  url: string;
  ad: string;
  sonDurum: boolean | null;
  sonKontrol: Date | null;
}

const servisler: ServisDetay[] = [
  { url: 'https://amele.onrender.com', ad: 'Amele Bot', sonDurum: null, sonKontrol: null },
  { url: 'https://warren-1.onrender.com', ad: 'Warren Bot', sonDurum: null, sonKontrol: null },
];

export async function servisleriKontrolEt(): Promise<void> {
  for (const servis of servisler) {
    try {
      const yanit = await axios.get(servis.url, { timeout: 10000 });
      const calisiyor = yanit.status >= 200 && yanit.status < 400;

      // Down → Up geçişi
      if (servis.sonDurum === false && calisiyor) {
        await grupaMesajGonder(
          `✅ *${servis.ad} tekrar çevrimiçi!*\n🕐 ${new Date().toLocaleString('tr-TR')}`
        );
        logger.info(`${servis.ad} tekrar online`);
      }

      // Up → Down geçişi
      if (servis.sonDurum === true && !calisiyor) {
        await grupaMesajGonder(
          `🔴 *${servis.ad} ÇEVRIMDIŞI!*\n⚠️ Servis yanıt vermiyor!\n🕐 ${new Date().toLocaleString('tr-TR')}`
        );
        logger.error(`${servis.ad} offline!`);
      }

      servis.sonDurum = calisiyor;
    } catch {
      if (servis.sonDurum !== false) {
        await grupaMesajGonder(
          `🔴 *${servis.ad} ÇEVRIMDIŞI!*\n⚠️ Bağlantı hatası!\n🕐 ${new Date().toLocaleString('tr-TR')}`
        );
        logger.error(`${servis.ad} erişilemiyor`);
      }
      servis.sonDurum = false;
    }
    servis.sonKontrol = new Date();
  }
}

export function servisleriGetir(): ServisDetay[] {
  return servisler;
}
