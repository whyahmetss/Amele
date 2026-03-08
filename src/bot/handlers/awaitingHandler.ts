import TelegramBot from 'node-telegram-bot-api';
import { gorevService } from '../../services/gorevService';
import { bugService } from '../../services/bugService';
import { claudeSor } from '../../integrations/claudeAI';
import { config } from '../../config';
import { standupKaydet, standupTamamlananEkle } from '../../jobs/gunlukRapor';
import * as awaitingState from '../utils/awaitingState';
import { logger } from '../../utils/logger';

/**
 * Butona basınca "metin yaz" denir → kullanıcı yazar → bu handler işler
 */
export function awaitingHandleriniKaydet(bot: TelegramBot): void {
  bot.on('message', async (mesaj) => {
    const metin = mesaj.text?.trim();
    const chatId = mesaj.chat.id;
    const userId = mesaj.from?.id;
    if (!metin || !userId) return;
    if (metin.startsWith('/')) {
      if (metin.toLowerCase() === '/iptal') {
        const a = awaitingState.get(chatId, userId);
        if (a) {
          awaitingState.clear(chatId, userId);
          await bot.sendMessage(chatId, '❌ İptal edildi.');
        }
      }
      return; // Komutları diğer handler'lar işlesin
    }

    const action = awaitingState.get(chatId, userId);
    if (!action) return;

    awaitingState.clear(chatId, userId);
    const ad = mesaj.from?.first_name || 'Bilinmeyen';

    try {
      switch (action) {
        case 'gorev_ekle': {
          const gorev = await gorevService.ekle(metin, userId, ad);
          await bot.sendMessage(chatId, `✅ *Görev eklendi* #${gorev.id}\n\n📌 ${gorev.metin}\n👤 ${ad}`, { parse_mode: 'Markdown' });
          break;
        }
        case 'gorev_bitir': {
          const id = parseInt(metin);
          if (isNaN(id)) {
            await bot.sendMessage(chatId, '⚠️ Geçerli bir sayı girin (örn: 3)');
            return;
          }
          const gorev = await gorevService.bitir(id);
          if (!gorev) {
            await bot.sendMessage(chatId, `❓ #${id} numaralı görev bulunamadı veya zaten tamamlanmış.`);
            return;
          }
          await bot.sendMessage(chatId, `✅ *Görev tamamlandı* #${gorev.id}\n\n~~${gorev.metin}~~`, { parse_mode: 'Markdown' });
          break;
        }
        case 'gorev_sil': {
          const id = parseInt(metin);
          if (isNaN(id)) {
            await bot.sendMessage(chatId, '⚠️ Geçerli bir sayı girin (örn: 3)');
            return;
          }
          const silindi = await gorevService.sil(id);
          if (!silindi) {
            await bot.sendMessage(chatId, `❓ #${id} numaralı görev bulunamadı.`);
            return;
          }
          await bot.sendMessage(chatId, `🗑️ Görev #${id} silindi.`);
          break;
        }
        case 'bug': {
          const bug = await bugService.ekle(metin, userId, ad);
          const analiz = await claudeSor(
            `Bu bug raporunu değerlendir. Sadece: SEVERITY: [KRİTİK/YÜKSEK/ORTA/DÜŞÜK]\nÖZET: [1 cümle]\nÖNLEM: [1 cümle]\n\nBug: "${metin}"`
          );
          const seviye = analiz.includes('KRİTİK') ? '🔴 KRİTİK' : analiz.includes('YÜKSEK') ? '🟠 YÜKSEK' : analiz.includes('ORTA') ? '🟡 ORTA' : '🟢 DÜŞÜK';
          await bot.sendMessage(chatId, `🐞 *Bug #${bug.id}*\n\n👤 ${ad}\n📝 ${metin}\n${seviye}\n\n🤖 ${analiz}`, { parse_mode: 'Markdown' });
          if (analiz.includes('KRİTİK')) {
            for (const adminId of config.telegram.adminIds) {
              try { await bot.sendMessage(adminId, `🚨 *KRİTİK BUG!* #${bug.id}\n\n${metin}`, { parse_mode: 'Markdown' }); } catch {}
            }
          }
          break;
        }
        case 'ai': {
          const yanit = await claudeSor(metin);
          await bot.sendMessage(chatId, `🤖 *AI Yanıtı*\n\n${yanit}`, { parse_mode: 'Markdown' });
          break;
        }
        case 'standup_plan': {
          standupKaydet(userId, ad, metin);
          await bot.sendMessage(chatId, `✅ *Standup kaydedildi!*\n\n👤 ${ad}\n📋 Plan: ${metin}\n\nAkşam 18:00'de özet 🕕`, { parse_mode: 'Markdown' });
          break;
        }
        case 'sinyal_long':
        case 'sinyal_short': {
          const yon = action === 'sinyal_long' ? 'LONG' : 'SHORT';
          const sembol = metin.toUpperCase().trim();
          const ikon = yon === 'LONG' ? '📈' : '📉';
          await bot.sendMessage(chatId, `${ikon} *${yon} ${sembol}*\n\n📍 Entry: —\n🎯 TP: —\n🛑 SL: —\n⚠️ Risk: —`, { parse_mode: 'Markdown' });
          break;
        }
        case 'standup_bitti': {
          const eklendi = standupTamamlananEkle(userId, metin);
          if (!eklendi) {
            await bot.sendMessage(chatId, '⚠️ Önce standup planını girin (Standup menüsünden).');
            return;
          }
          await bot.sendMessage(chatId, `✅ Tamamlanan: _${metin}_\n\nAkşam 18:00'de özet.`, { parse_mode: 'Markdown' });
          break;
        }
      }
    } catch (hata) {
      logger.error('Awaiting handler hatası:', hata);
      await bot.sendMessage(chatId, '❌ Bir hata oluştu.');
    }
  });
}
