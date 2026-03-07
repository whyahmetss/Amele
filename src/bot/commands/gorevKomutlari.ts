import TelegramBot from 'node-telegram-bot-api';
import { gorevService } from '../../services/gorevService';
import { logger } from '../../utils/logger';

export function gorevKomutlariniKaydet(bot: TelegramBot): void {

  // /gorev ekle <metin>
  bot.onText(/^\/gorev ekle (.+)/i, async (mesaj, eslesme) => {
    const metin = eslesme?.[1]?.trim();
    const ad = mesaj.from?.first_name || 'Bilinmeyen';
    const id = mesaj.from?.id || 0;

    if (!metin) {
      bot.sendMessage(mesaj.chat.id, '⚠️ Görev metni boş olamaz.\nKullanım: `/gorev ekle Login API düzelt`', { parse_mode: 'Markdown' });
      return;
    }

    try {
      const gorev = await gorevService.ekle(metin, id, ad);
      bot.sendMessage(
        mesaj.chat.id,
        `✅ *Görev eklendi* #${gorev.id}\n\n📌 ${gorev.metin}\n👤 ${ad}`,
        { parse_mode: 'Markdown' }
      );
    } catch (hata) {
      logger.error('Görev ekleme hatası:', hata);
      bot.sendMessage(mesaj.chat.id, '❌ Görev eklenemedi. Lütfen tekrar deneyin.');
    }
  });

  // /gorev liste
  bot.onText(/^\/gorev liste/i, async (mesaj) => {
    try {
      const gorevler = await gorevService.liste();
      const metin = gorevService.formatListeMesaji(gorevler);
      bot.sendMessage(mesaj.chat.id, metin, { parse_mode: 'Markdown' });
    } catch (hata) {
      logger.error('Görev liste hatası:', hata);
      bot.sendMessage(mesaj.chat.id, '❌ Görevler listelenemedi.');
    }
  });

  // /gorev bitir <id>
  bot.onText(/^\/gorev bitir (\d+)/i, async (mesaj, eslesme) => {
    const id = parseInt(eslesme?.[1] || '0');
    if (!id) {
      bot.sendMessage(mesaj.chat.id, '⚠️ Geçersiz ID.\nKullanım: `/gorev bitir 3`', { parse_mode: 'Markdown' });
      return;
    }

    try {
      const gorev = await gorevService.bitir(id);
      if (!gorev) {
        bot.sendMessage(mesaj.chat.id, `❓ #${id} numaralı görev bulunamadı veya zaten tamamlanmış.`);
        return;
      }
      bot.sendMessage(
        mesaj.chat.id,
        `✅ *Görev tamamlandı* #${gorev.id}\n\n~~${gorev.metin}~~`,
        { parse_mode: 'Markdown' }
      );
    } catch (hata) {
      logger.error('Görev bitirme hatası:', hata);
      bot.sendMessage(mesaj.chat.id, '❌ Görev güncellenemedi.');
    }
  });

  // /gorev sil <id>
  bot.onText(/^\/gorev sil (\d+)/i, async (mesaj, eslesme) => {
    const id = parseInt(eslesme?.[1] || '0');
    if (!id) {
      bot.sendMessage(mesaj.chat.id, '⚠️ Geçersiz ID.\nKullanım: `/gorev sil 3`', { parse_mode: 'Markdown' });
      return;
    }

    try {
      const silindi = await gorevService.sil(id);
      if (!silindi) {
        bot.sendMessage(mesaj.chat.id, `❓ #${id} numaralı görev bulunamadı.`);
        return;
      }
      bot.sendMessage(mesaj.chat.id, `🗑️ Görev #${id} silindi.`);
    } catch (hata) {
      logger.error('Görev silme hatası:', hata);
      bot.sendMessage(mesaj.chat.id, '❌ Görev silinemedi.');
    }
  });
}
