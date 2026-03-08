import TelegramBot from 'node-telegram-bot-api';
import { gorevService } from '../../services/gorevService';
import { bugService } from '../../services/bugService';
import { auditService } from '../../services/auditService';
import { webhookService } from '../../services/webhookService';
import { claudeSor } from '../../integrations/claudeAI';
import { config } from '../../config';
import { standupKaydet, standupTamamlananEkle } from '../../jobs/gunlukRapor';
import * as awaitingState from '../utils/awaitingState';
import { logger } from '../../utils/logger';

const SABLONLAR = [
  { metin: 'Bug fix: ', oncelik: 'yuksek', etiket: 'bugfix' },
  { metin: 'Yeni özellik: ', oncelik: 'orta', etiket: 'feature' },
  { metin: 'Refactor: ', oncelik: 'dusuk', etiket: 'refactor' },
  { metin: 'Dökümantasyon: ', oncelik: 'dusuk', etiket: 'docs' },
  { metin: 'Test: ', oncelik: 'orta', etiket: 'test' },
  { metin: 'Güvenlik: ', oncelik: 'kritik', etiket: 'security' },
];

export function awaitingHandleriniKaydet(bot: TelegramBot): void {
  bot.on('message', async (mesaj) => {
    const metin = mesaj.text?.trim();
    const chatId = mesaj.chat.id;
    const userId = mesaj.from?.id;
    if (!metin || !userId) return;

    if (metin.startsWith('/')) {
      if (metin.toLowerCase() === '/iptal') {
        if (awaitingState.get(chatId, userId)) {
          awaitingState.clear(chatId, userId);
          await bot.sendMessage(chatId, '❌ İptal edildi.');
        }
      }
      return;
    }

    const action = awaitingState.get(chatId, userId);
    if (!action) return;

    awaitingState.clear(chatId, userId);
    const ad = mesaj.from?.first_name || 'Bilinmeyen';

    try {
      // --- Görev ekle ---
      if (action === 'gorev_ekle') {
        const benzerler = await gorevService.benzerBul(metin);
        const gorev = await gorevService.ekle(metin, userId, ad);

        // AI otomatik kategori
        try {
          const kat = await claudeSor(
            `Aşağıdaki görev metninin kategorisini belirle. Sadece TEK kelime yaz: frontend, backend, api, database, devops, ui, test, docs, security, other\n\nGörev: "${metin}"`
          );
          const kategori = kat.trim().toLowerCase().split(/\s+/)[0];
          if (kategori && kategori.length < 20) await gorevService.kategoriGuncelle(gorev.id, kategori);
        } catch {}

        await auditService.kaydet(userId, ad, 'gorev_eklendi', metin, 'gorev', gorev.id);
        await webhookService.tetikle('gorev_eklendi', { id: gorev.id, metin, ekleyen: ad });

        let yanit = `✅ *Görev eklendi* #${gorev.id}\n\n📌 ${gorev.metin}\n👤 ${ad}`;
        if (benzerler.length > 0) {
          yanit += `\n\n⚠️ *Benzer görevler:*\n${benzerler.map(b => `   • #${b.id} ${b.metin}`).join('\n')}`;
        }

        const butonlar: TelegramBot.InlineKeyboardButton[][] = [
          [
            { text: '🔴 Kritik', callback_data: `setpri:kritik:${gorev.id}` },
            { text: '🟠 Yüksek', callback_data: `setpri:yuksek:${gorev.id}` },
            { text: '🟡 Orta', callback_data: `setpri:orta:${gorev.id}` },
            { text: '🟢 Düşük', callback_data: `setpri:dusuk:${gorev.id}` },
          ],
          [
            { text: '👤 Ata', callback_data: `act:ata:${gorev.id}` },
          ],
        ];
        if (config.github.token && config.github.repo) {
          butonlar[1].push({ text: "🔗 GitHub", callback_data: `github:gorev:${gorev.id}` });
        }
        await bot.sendMessage(chatId, yanit, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: butonlar } });
        return;
      }

      // --- Şablon görev ---
      if (action.startsWith('sablon_')) {
        const idx = parseInt(action.replace('sablon_', ''));
        const s = SABLONLAR[idx];
        if (s) {
          const fullMetin = s.metin + metin;
          const gorev = await gorevService.ekle(fullMetin, userId, ad, {
            oncelik: s.oncelik, etiketler: [s.etiket],
          });
          await auditService.kaydet(userId, ad, 'gorev_eklendi', fullMetin, 'gorev', gorev.id);
          await webhookService.tetikle('gorev_eklendi', { id: gorev.id, metin: fullMetin, ekleyen: ad, sablon: s.etiket });
          await bot.sendMessage(chatId, `✅ *Görev eklendi* #${gorev.id}\n\n📌 ${fullMetin}\n🏷 ${s.etiket} · Öncelik: ${s.oncelik}\n👤 ${ad}`, { parse_mode: 'Markdown' });
        }
        return;
      }

      // --- Görev atama ---
      if (action.startsWith('gorev_ata_')) {
        const gorevId = parseInt(action.replace('gorev_ata_', ''));
        const g = await gorevService.ata(gorevId, userId, metin);
        if (g) {
          await auditService.kaydet(userId, ad, 'gorev_atandi', `#${gorevId} → ${metin}`, 'gorev', gorevId);
          await bot.sendMessage(chatId, `✅ #${gorevId} → *${metin}*'e atandı.`, { parse_mode: 'Markdown' });
        } else {
          await bot.sendMessage(chatId, `❓ Görev #${gorevId} bulunamadı.`);
        }
        return;
      }

      // --- Diğer aksiyonlar ---
      switch (action) {
        case 'gorev_bitir': {
          const id = parseInt(metin);
          if (isNaN(id)) { await bot.sendMessage(chatId, '⚠️ Geçerli bir sayı girin.'); return; }
          const g = await gorevService.bitir(id);
          if (g) {
            await auditService.kaydet(userId, ad, 'gorev_bitti', g.metin, 'gorev', id);
            await webhookService.tetikle('gorev_bitti', { id, metin: g.metin, bitiren: ad });
            await bot.sendMessage(chatId, `✅ *Tamamlandı* #${id}\n\n~~${g.metin}~~`, { parse_mode: 'Markdown' });
          } else {
            await bot.sendMessage(chatId, `❓ #${id} bulunamadı.`);
          }
          break;
        }
        case 'gorev_sil': {
          const id = parseInt(metin);
          if (isNaN(id)) { await bot.sendMessage(chatId, '⚠️ Geçerli bir sayı girin.'); return; }
          const silindi = await gorevService.sil(id);
          if (silindi) {
            await auditService.kaydet(userId, ad, 'gorev_silindi', `#${id}`, 'gorev', id);
            await bot.sendMessage(chatId, `🗑️ Görev #${id} silindi.`);
          } else { await bot.sendMessage(chatId, `❓ #${id} bulunamadı.`); }
          break;
        }
        case 'bug': {
          const bug = await bugService.ekle(metin, userId, ad);
          const analiz = await claudeSor(`Bug: "${metin}"\nSadece: SEVERITY: [KRİTİK/YÜKSEK/ORTA/DÜŞÜK]\nÖZET: [1 cümle]\nÖNLEM: [1 cümle]`);
          const seviye = analiz.includes('KRİTİK') ? '🔴 KRİTİK' : analiz.includes('YÜKSEK') ? '🟠 YÜKSEK' : analiz.includes('ORTA') ? '🟡 ORTA' : '🟢 DÜŞÜK';
          await auditService.kaydet(userId, ad, 'bug_eklendi', metin, 'bug', bug.id);
          await webhookService.tetikle('bug_eklendi', { id: bug.id, aciklama: metin, bildiren: ad });
          const butonlar: TelegramBot.InlineKeyboardButton[][] = [];
          if (config.github.token && config.github.repo) butonlar.push([{ text: "🔗 GitHub", callback_data: `github:bug:${bug.id}` }]);
          await bot.sendMessage(chatId, `🐞 *Bug #${bug.id}*\n\n👤 ${ad}\n📝 ${metin}\n${seviye}\n\n🤖 ${analiz}`, {
            parse_mode: 'Markdown',
            reply_markup: butonlar.length ? { inline_keyboard: butonlar } : undefined,
          });
          if (analiz.includes('KRİTİK')) {
            for (const adminId of config.telegram.adminIds) {
              try { await bot.sendMessage(adminId, `🚨 *KRİTİK BUG!* #${bug.id}\n\n${metin}`, { parse_mode: 'Markdown' }); } catch {}
            }
          }
          break;
        }
        case 'ai': {
          const yanit = await claudeSor(metin);
          await bot.sendMessage(chatId, `🤖 *AI*\n\n${yanit}`, { parse_mode: 'Markdown' });
          break;
        }
        case 'sinyal_long':
        case 'sinyal_short': {
          const yon = action === 'sinyal_long' ? 'LONG' : 'SHORT';
          const ikon = yon === 'LONG' ? '📈' : '📉';
          await bot.sendMessage(chatId, `${ikon} *${yon} ${metin.toUpperCase()}*\n\n📍 Entry: —\n🎯 TP: —\n🛑 SL: —\n⚠️ Risk: —`, { parse_mode: 'Markdown' });
          break;
        }
        case 'standup_plan':
          standupKaydet(userId, ad, metin);
          await bot.sendMessage(chatId, `✅ *Standup kaydedildi*\n\n👤 ${ad}\n📋 ${metin}\n\n🕕 Akşam 18:00 özet`, { parse_mode: 'Markdown' });
          break;
        case 'standup_bitti': {
          const eklendi = standupTamamlananEkle(userId, metin);
          if (!eklendi) { await bot.sendMessage(chatId, '⚠️ Önce standup planı girin.'); return; }
          await bot.sendMessage(chatId, `✅ Tamamlanan: _${metin}_`, { parse_mode: 'Markdown' });
          break;
        }
        case 'webhook_ekle': {
          if (!metin.startsWith('http')) { await bot.sendMessage(chatId, '⚠️ Geçerli URL girin.'); return; }
          const id = await webhookService.ekle(metin);
          if (id) {
            await auditService.kaydet(userId, ad, 'webhook_eklendi', metin);
            await bot.sendMessage(chatId, `✅ Webhook #${id} eklendi.\nURL: ${metin}`);
          } else {
            await bot.sendMessage(chatId, '❌ Webhook eklenemedi.');
          }
          break;
        }
      }
    } catch (hata) {
      logger.error('Awaiting handler hatası:', hata);
      await bot.sendMessage(chatId, '❌ Bir hata oluştu.');
    }
  });
}
