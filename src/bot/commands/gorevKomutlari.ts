import TelegramBot from 'node-telegram-bot-api';
import { gorevService } from '../../services/gorevService';
import { logger } from '../../utils/logger';
import { config } from '../../config';

export function gorevKomutlariniKaydet(bot: TelegramBot): void {

  // /gorev dogal "Yarın Login API düzelt" - AI parse edip görev oluşturur
  bot.onText(/^\/gorev dogal (.+)/i, async (mesaj, eslesme) => {
    const metin = eslesme?.[1]?.trim();
    const ad = mesaj.from?.first_name || 'Bilinmeyen';
    const id = mesaj.from?.id || 0;
    if (!metin) {
      bot.sendMessage(mesaj.chat.id, '⚠️ Kullanım: `/gorev dogal Yarın Login API düzelt`', { parse_mode: 'Markdown' });
      return;
    }
    try {
      const { claudeSor } = await import('../../integrations/claudeAI');
      const gorevMetni = await claudeSor(
        `Aşağıdaki metni TEK BİR GÖREV metnine dönüştür. Sadece görev metnini yaz, başka hiçbir şey yazma. Tarih/zaman bilgisini atla.
Örnek: "Yarın sabah Login sayfasını düzelt" → "Login sayfasını düzelt"
Metin: "${metin}"`
      );
      const gorev = await gorevService.ekle(gorevMetni.trim(), id, ad);
      bot.sendMessage(mesaj.chat.id, `✅ *Görev eklendi* #${gorev.id}\n\n📌 ${gorev.metin}\n👤 ${ad}`, { parse_mode: 'Markdown' });
    } catch (hata) {
      logger.error('Doğal dil görev hatası:', hata);
      bot.sendMessage(mesaj.chat.id, '❌ Görev oluşturulamadı.');
    }
  });

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
      const opts: TelegramBot.SendMessageOptions = { parse_mode: 'Markdown' };
      if (config.github.token && config.github.repo) {
        opts.reply_markup = {
          inline_keyboard: [[{ text: "🔗 GitHub'a Gönder", callback_data: `github:gorev:${gorev.id}` }]],
        };
      }
      bot.sendMessage(
        mesaj.chat.id,
        `✅ *Görev eklendi* #${gorev.id}\n\n📌 ${gorev.metin}\n👤 ${ad}`,
        opts
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

  // /sprint - Deepseek ile görev analizi
  bot.onText(/^\/sprint/i, async (mesaj) => {
    try {
      const gorevler = await gorevService.liste();
      if (!gorevler.length) {
        bot.sendMessage(mesaj.chat.id, '📋 Aktif görev yok.');
        return;
      }

      bot.sendMessage(mesaj.chat.id, '🤖 Görevler analiz ediliyor...');

      const gorevListesi = gorevler.map((g: any) => `#${g.id}: ${g.metin}`).join('\n');

      const { claudeSor } = await import('../../integrations/claudeAI');
      const analiz = await claudeSor(
        `UstaGo projesi için aşağıdaki görevleri analiz et. Önceliklendirme yap, tahmini süre ver, varsa bağımlılıkları belirt. Kısa ve net ol:\n\n${gorevListesi}`
      );

      bot.sendMessage(
        mesaj.chat.id,
        `🚀 *Sprint Analizi*\n\n${analiz}`,
        { parse_mode: 'Markdown' }
      );
    } catch (hata) {
      logger.error('Sprint hatası:', hata);
      bot.sendMessage(mesaj.chat.id, '❌ Sprint analizi yapılamadı.');
    }
  });
}
// Bu satırı sil - append düzgün çalışmıyor
