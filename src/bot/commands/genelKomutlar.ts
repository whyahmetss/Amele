import TelegramBot from 'node-telegram-bot-api';
import { gorevService } from '../../services/gorevService';
import { bugService } from '../../services/bugService';
import { auditService } from '../../services/auditService';
import { webhookService } from '../../services/webhookService';
import { db } from '../../models/database';
import { redis } from '../../models/redis';
import { deployService } from '../../services/deployService';
import { servisleriGetir } from '../../services/renderIzleme';
import { claudeSor } from '../../integrations/claudeAI';
import { standupGetir, standupBugunTumunuGetir } from '../../jobs/gunlukRapor';
import { nobetService } from '../../services/nobetService';
import { issueOlustur } from '../../services/githubService';
import { adminMi } from '../middlewares/auth';
import * as awaitingState from '../utils/awaitingState';
import { logger } from '../../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const SABLONLAR = [
  { ad: '🐛 Bug Fix', metin: 'Bug fix: ', oncelik: 'yuksek', etiket: 'bugfix' },
  { ad: '✨ Yeni Özellik', metin: 'Yeni özellik: ', oncelik: 'orta', etiket: 'feature' },
  { ad: '♻️ Refactor', metin: 'Refactor: ', oncelik: 'dusuk', etiket: 'refactor' },
  { ad: '📖 Dökümantasyon', metin: 'Dökümantasyon: ', oncelik: 'dusuk', etiket: 'docs' },
  { ad: '🧪 Test', metin: 'Test: ', oncelik: 'orta', etiket: 'test' },
  { ad: '🔒 Güvenlik', metin: 'Güvenlik: ', oncelik: 'kritik', etiket: 'security' },
];

const MAIN_METIN = `🛠 *UstaGo Panel*\n\nAna menüden bir kategori seçin.`;

const MAIN_KEYBOARD: TelegramBot.InlineKeyboardButton[][] = [
  [{ text: '📋 Görevler', callback_data: 'menu:gorevler' }],
  [{ text: '🖥 Sunucu', callback_data: 'menu:sunucu' }],
  [{ text: '🐞 Bug & AI', callback_data: 'menu:bugai' }],
  [{ text: '📈 Sinyal', callback_data: 'menu:sinyal' }],
  [{ text: '📋 Diğer', callback_data: 'menu:diger' }],
  [{ text: '⚙️ Yönetim', callback_data: 'menu:yonetim' }],
];

const MENU_KEYBOARDS: Record<string, { metin: string; klavye: TelegramBot.InlineKeyboardButton[][] }> = {
  gorevler: {
    metin: `🛠 *UstaGo Panel*\n\n📋 *Görevler*`,
    klavye: [
      [{ text: '➕ Görev ekle', callback_data: 'cmd:gorev_ekle' }, { text: '📋 Görev liste', callback_data: 'cmd:gorev_liste' }],
      [{ text: '📝 Şablondan ekle', callback_data: 'cmd:gorev_sablon' }],
      [{ text: '📊 İstatistik', callback_data: 'cmd:gorev_istatistik' }, { text: '📤 Dışa aktar', callback_data: 'menu:export' }],
      [{ text: '← Ana menü', callback_data: 'menu:main' }],
    ],
  },
  export: {
    metin: `🛠 *UstaGo Panel*\n\n📤 *Dışa Aktar*`,
    klavye: [
      [{ text: '📝 Markdown', callback_data: 'cmd:export_md' }, { text: '📊 CSV', callback_data: 'cmd:export_csv' }, { text: '{ } JSON', callback_data: 'cmd:export_json' }],
      [{ text: '← Görevler', callback_data: 'menu:gorevler' }],
    ],
  },
  sunucu: {
    metin: `🛠 *UstaGo Panel*\n\n🖥 *Sunucu*`,
    klavye: [
      [{ text: 'CPU / RAM', callback_data: 'cmd:server_durum' }, { text: 'Log çek', callback_data: 'cmd:server_log' }],
      [{ text: 'Restart', callback_data: 'cmd:server_restart' }, { text: 'Deploy', callback_data: 'cmd:deploy' }],
      [{ text: '← Ana menü', callback_data: 'menu:main' }],
    ],
  },
  bugai: {
    metin: `🛠 *UstaGo Panel*\n\n🐞 *Bug & AI*`,
    klavye: [
      [{ text: '🐞 Bug Raporu', callback_data: 'cmd:bug' }, { text: '🤖 AI Sor', callback_data: 'cmd:ai' }],
      [{ text: '← Ana menü', callback_data: 'menu:main' }],
    ],
  },
  sinyal: {
    metin: `🛠 *UstaGo Panel*\n\n📈 *Sinyal*`,
    klavye: [
      [{ text: '📈 Sinyal LONG', callback_data: 'cmd:sinyal_long' }, { text: '📉 Sinyal SHORT', callback_data: 'cmd:sinyal_short' }],
      [{ text: '← Ana menü', callback_data: 'menu:main' }],
    ],
  },
  diger: {
    metin: `🛠 *UstaGo Panel*\n\n📋 *Diğer*`,
    klavye: [
      [{ text: '☀️ Bugün Ne Var?', callback_data: 'cmd:bugun_ne_var' }],
      [{ text: '📋 Standup plan', callback_data: 'cmd:standup_plan' }, { text: '✓ Standup bitti', callback_data: 'cmd:standup_bitti' }, { text: '👀 Görüntüle', callback_data: 'cmd:standup' }],
      [{ text: '📝 Changelog', callback_data: 'cmd:changelog' }, { text: '🔄 Retro', callback_data: 'cmd:retro' }],
      [{ text: '🖥 Servisler', callback_data: 'cmd:servisler' }, { text: '👮 Nöbet', callback_data: 'cmd:nobet' }],
      [{ text: '← Ana menü', callback_data: 'menu:main' }],
    ],
  },
  yonetim: {
    metin: `🛠 *UstaGo Panel*\n\n⚙️ *Yönetim* _(sadece admin)_`,
    klavye: [
      [{ text: '📜 Audit Log', callback_data: 'cmd:audit_log' }],
      [{ text: '🔗 Webhook ekle', callback_data: 'cmd:webhook_ekle' }, { text: '🔗 Webhook liste', callback_data: 'cmd:webhook_liste' }],
      [{ text: '← Ana menü', callback_data: 'menu:main' }],
    ],
  },
};

export function genelKomutlariniKaydet(bot: TelegramBot): void {

  bot.onText(/^\/(start|yardim)/i, (mesaj) => {
    bot.sendMessage(mesaj.chat.id, MAIN_METIN, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: MAIN_KEYBOARD },
    });
  });

  bot.on('callback_query', async (callback) => {
    const data = callback.data;
    if (!data) return;
    const chatId = callback.message?.chat?.id;
    const userId = callback.from?.id;
    const userName = callback.from?.first_name || 'Bilinmeyen';
    if (!chatId) return;

    await bot.answerCallbackQuery(callback.id);

    // --- GitHub issue ---
    if (data.startsWith('github:')) {
      const [, tip, idStr] = data.split(':');
      const ghId = parseInt(idStr || '0');
      if (!ghId) return;
      try {
        if (tip === 'gorev') {
          const g = await gorevService.getir(ghId);
          if (g) {
            const sonuc = await issueOlustur(`[Görev #${ghId}] ${g.metin}`, `Görev: ${g.metin}\n\nEkleyen: ${g.ekleyen_ad}`);
            if (sonuc.url) {
              await gorevService.githubUrlGuncelle(ghId, sonuc.url);
              await bot.sendMessage(chatId, `✅ GitHub issue: ${sonuc.url}`);
            } else {
              await bot.sendMessage(chatId, `❌ ${sonuc.hata}`);
            }
          }
        } else if (tip === 'bug') {
          const r = await db.query<{ aciklama: string; bildiren_ad: string }>('SELECT aciklama, bildiren_ad FROM bug_raporlari WHERE id = $1', [ghId]);
          const b = r.rows[0];
          if (b) {
            const sonuc = await issueOlustur(`[Bug #${ghId}] ${b.aciklama}`, `Bug: ${b.aciklama}\n\nBildiren: ${b.bildiren_ad}`, ['bug']);
            await bot.sendMessage(chatId, sonuc.url ? `✅ GitHub issue: ${sonuc.url}` : `❌ ${sonuc.hata}`);
          }
        }
      } catch (hata) {
        logger.error('GitHub buton hatası:', hata);
        await bot.sendMessage(chatId, '❌ GitHub issue oluşturulamadı.');
      }
      return;
    }

    // --- Inline aksiyonlar: act:bitir:5, act:sil:5, act:ata:5 ---
    if (data.startsWith('act:')) {
      const [, aksiyon, idStr] = data.split(':');
      const gorevId = parseInt(idStr || '0');
      if (!gorevId || !userId) return;
      try {
        if (aksiyon === 'bitir') {
          const g = await gorevService.bitir(gorevId);
          if (g) {
            await auditService.kaydet(userId, userName, 'gorev_bitti', g.metin, 'gorev', gorevId);
            await webhookService.tetikle('gorev_bitti', { id: gorevId, metin: g.metin, bitiren: userName });
            await bot.sendMessage(chatId, `✅ *Görev tamamlandı* #${gorevId}\n\n~~${g.metin}~~`, { parse_mode: 'Markdown' });
          } else {
            await bot.sendMessage(chatId, `❓ #${gorevId} bulunamadı veya zaten tamamlanmış.`);
          }
        } else if (aksiyon === 'sil') {
          // Onay iste
          await bot.sendMessage(chatId, `⚠️ *#${gorevId} silinsin mi?*`, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '✅ Evet, sil', callback_data: `onay:sil_gorev:${gorevId}` }, { text: '❌ İptal', callback_data: `onay:iptal:${gorevId}` }],
              ],
            },
          });
        } else if (aksiyon === 'ata') {
          if (userId) {
            awaitingState.set(chatId, userId, `gorev_ata_${gorevId}` as any);
            await bot.sendMessage(chatId, `👤 *#${gorevId} kime atansın?*\nKişinin adını yazın.\n\n_İptal: /iptal_`, { parse_mode: 'Markdown' });
          }
        } else if (aksiyon === 'oncelik') {
          await bot.sendMessage(chatId, `*#${gorevId} Öncelik seçin:*`, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔴 Kritik', callback_data: `setpri:kritik:${gorevId}` },
                  { text: '🟠 Yüksek', callback_data: `setpri:yuksek:${gorevId}` },
                  { text: '🟡 Orta', callback_data: `setpri:orta:${gorevId}` },
                  { text: '🟢 Düşük', callback_data: `setpri:dusuk:${gorevId}` },
                ],
              ],
            },
          });
        }
      } catch (hata) {
        logger.error('Aksiyon hatası:', hata);
        await bot.sendMessage(chatId, '❌ İşlem başarısız.');
      }
      return;
    }

    // --- Öncelik güncelleme ---
    if (data.startsWith('setpri:')) {
      const [, oncelik, idStr] = data.split(':');
      const gorevId = parseInt(idStr || '0');
      if (!gorevId || !userId) return;
      const g = await gorevService.oncelikGuncelle(gorevId, oncelik);
      if (g) {
        await auditService.kaydet(userId, userName, 'gorev_eklendi', `Öncelik: ${oncelik}`, 'gorev', gorevId);
        await bot.sendMessage(chatId, `✅ #${gorevId} öncelik: *${oncelik.toUpperCase()}*`, { parse_mode: 'Markdown' });
      }
      return;
    }

    // --- Onay işlemleri ---
    if (data.startsWith('onay:')) {
      const [, tip, idStr] = data.split(':');
      const hedefId = parseInt(idStr || '0');
      if (!userId) return;
      if (tip === 'sil_gorev' && hedefId) {
        const silindi = await gorevService.sil(hedefId);
        if (silindi) {
          await auditService.kaydet(userId, userName, 'gorev_silindi', `Görev #${hedefId}`, 'gorev', hedefId);
          await bot.sendMessage(chatId, `🗑️ Görev #${hedefId} silindi.`);
        } else {
          await bot.sendMessage(chatId, `❓ Görev #${hedefId} bulunamadı.`);
        }
      } else if (tip === 'sil_deploy') {
        if (!adminMi(userId)) { await bot.sendMessage(chatId, '🚫 Yetkiniz yok.'); return; }
        await sunucuKomutCalistir(bot, chatId, 'deploy', userId, userName);
      } else if (tip === 'sil_restart') {
        if (!adminMi(userId)) { await bot.sendMessage(chatId, '🚫 Yetkiniz yok.'); return; }
        await sunucuKomutCalistir(bot, chatId, 'server_restart', userId, userName);
      } else if (tip === 'iptal') {
        await bot.sendMessage(chatId, '❌ İptal edildi.');
      }
      return;
    }

    // --- Şablon seçimi ---
    if (data.startsWith('sablon:')) {
      const idx = parseInt(data.replace('sablon:', ''));
      const s = SABLONLAR[idx];
      if (s && userId) {
        awaitingState.set(chatId, userId, `sablon_${idx}` as any);
        await bot.sendMessage(chatId, `📝 *${s.ad}*\n\nGörev detayını yazın:\n\`${s.metin}...\`\n\n_İptal: /iptal_`, { parse_mode: 'Markdown' });
      }
      return;
    }

    // --- Alt menüler ---
    if (data.startsWith('menu:')) {
      const menu = data.replace('menu:', '');
      const msgId = callback.message?.message_id;
      if (!msgId) return;
      try {
        if (menu === 'main') {
          await bot.editMessageText(MAIN_METIN, { chat_id: chatId, message_id: msgId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: MAIN_KEYBOARD } });
        } else {
          const m = MENU_KEYBOARDS[menu];
          if (m) await bot.editMessageText(m.metin, { chat_id: chatId, message_id: msgId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: m.klavye } });
        }
      } catch { /* mesaj zaten aynı */ }
      return;
    }

    if (!data.startsWith('cmd:')) return;
    const cmd = data.replace('cmd:', '');

    try {
      switch (cmd) {
        case 'bugun_ne_var':
          await bugunNeVarCalistir(bot, chatId);
          break;
        case 'gorev_liste': {
          const gorevler = await gorevService.liste();
          const { metin, butonlar } = gorevService.formatListeButonlu(gorevler);
          const klavye = butonlar.length > 0
            ? [...butonlar, [{ text: '← Görevler', callback_data: 'menu:gorevler' }]]
            : [];
          await bot.sendMessage(chatId, metin, { parse_mode: 'Markdown', reply_markup: klavye.length ? { inline_keyboard: klavye } : undefined });
          break;
        }
        case 'gorev_istatistik': {
          const { satirlar } = await gorevService.istatistik();
          await bot.sendMessage(chatId, satirlar, { parse_mode: 'Markdown' });
          break;
        }
        case 'gorev_sablon': {
          const butonlar = SABLONLAR.map((s, i) => [{ text: s.ad, callback_data: `sablon:${i}` }]);
          await bot.sendMessage(chatId, '📝 *Şablon seçin:*', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: butonlar } });
          break;
        }
        case 'export_md':
        case 'export_csv':
        case 'export_json': {
          await exportGonder(bot, chatId, cmd.replace('export_', '') as 'md' | 'csv' | 'json');
          break;
        }
        case 'gorev_ekle':
          if (userId) {
            awaitingState.set(chatId, userId, 'gorev_ekle');
            await bot.sendMessage(chatId, '📝 *Görev metnini yazın:*\n\n_İptal: /iptal_', { parse_mode: 'Markdown' });
          }
          break;
        case 'bug':
          if (userId) { awaitingState.set(chatId, userId, 'bug'); await bot.sendMessage(chatId, '🐞 *Bug açıklamasını yazın:*\n\n_İptal: /iptal_', { parse_mode: 'Markdown' }); }
          break;
        case 'ai':
          if (userId) { awaitingState.set(chatId, userId, 'ai'); await bot.sendMessage(chatId, '🤖 *Sorunuzu yazın:*\n\n_İptal: /iptal_', { parse_mode: 'Markdown' }); }
          break;
        case 'sinyal_long':
        case 'sinyal_short':
          if (userId) {
            awaitingState.set(chatId, userId, cmd as any);
            const yon = cmd === 'sinyal_long' ? 'LONG' : 'SHORT';
            await bot.sendMessage(chatId, `📈 *${yon} için sembol yazın:*\n\nÖrn: BTC, ETH\n_İptal: /iptal_`, { parse_mode: 'Markdown' });
          }
          break;
        case 'standup_plan':
          if (userId) { awaitingState.set(chatId, userId, 'standup_plan'); await bot.sendMessage(chatId, '📋 *Bugün ne yapacaksınız?*\n\n_İptal: /iptal_', { parse_mode: 'Markdown' }); }
          break;
        case 'standup_bitti':
          if (userId) { awaitingState.set(chatId, userId, 'standup_bitti'); await bot.sendMessage(chatId, '✓ *Ne tamamladınız?*\n\n_İptal: /iptal_', { parse_mode: 'Markdown' }); }
          break;
        case 'standup': {
          const mevcut = userId ? standupGetir(userId) : null;
          if (mevcut) {
            await bot.sendMessage(chatId, `📋 *Standup*\n\n📌 Plan: ${mevcut.plan}\n✅ Tamamlanan: ${mevcut.tamamlanan.join(', ') || '-'}`, { parse_mode: 'Markdown' });
          } else {
            await bot.sendMessage(chatId, '📝 Standup kaydınız yok. Menüden "Standup plan" ile ekleyin.');
          }
          break;
        }
        case 'changelog': await ekstraChangelogCalistir(bot, chatId); break;
        case 'retro': await retroCalistir(bot, chatId); break;
        case 'servisler': await ekstraServislerCalistir(bot, chatId); break;
        case 'nobet': {
          const nobet = await nobetService.bugunGetir();
          await bot.sendMessage(chatId, nobet ? `👮 *Nöbetçi:* ${nobet.kullanici_ad}\n📅 ${nobet.tarih}` : '📅 Bugün nöbet atanmamış.', { parse_mode: 'Markdown' });
          break;
        }
        case 'audit_log': {
          if (!userId || !adminMi(userId)) { await bot.sendMessage(chatId, '🚫 Yetkiniz yok.'); break; }
          const kayitlar = await auditService.sonKayitlar();
          if (!kayitlar.length) { await bot.sendMessage(chatId, '📜 Henüz audit kaydı yok.'); break; }
          const satirlar = kayitlar.map(k => {
            const t = new Date(k.olusturuldu).toLocaleString('tr-TR');
            return `• *${k.islem}* — ${k.kullanici_ad}\n   ${k.detay || '-'} · ${t}`;
          }).join('\n');
          await bot.sendMessage(chatId, `📜 *Audit Log*\n\n${satirlar}`, { parse_mode: 'Markdown' });
          break;
        }
        case 'webhook_ekle':
          if (!userId || !adminMi(userId)) { await bot.sendMessage(chatId, '🚫 Yetkiniz yok.'); break; }
          awaitingState.set(chatId, userId, 'webhook_ekle' as any);
          await bot.sendMessage(chatId, '🔗 *Webhook URL\'sini yazın:*\n\n_İptal: /iptal_', { parse_mode: 'Markdown' });
          break;
        case 'webhook_liste': {
          if (!userId || !adminMi(userId)) { await bot.sendMessage(chatId, '🚫 Yetkiniz yok.'); break; }
          const wl = await webhookService.liste();
          if (!wl.length) { await bot.sendMessage(chatId, '🔗 Kayıtlı webhook yok.'); break; }
          const wSat = wl.map(w => `#${w.id} ${w.aktif ? '🟢' : '🔴'} ${w.url}\n   Olaylar: ${w.olaylar.join(', ')}`).join('\n\n');
          await bot.sendMessage(chatId, `🔗 *Webhooklar*\n\n${wSat}`, { parse_mode: 'Markdown' });
          break;
        }
        case 'server_durum':
        case 'server_saglik':
        case 'server_log':
          if (!userId || !adminMi(userId)) { await bot.sendMessage(chatId, '🚫 Yetkiniz yok.'); break; }
          await sunucuKomutCalistir(bot, chatId, cmd, userId, userName);
          break;
        case 'server_restart':
          if (!userId || !adminMi(userId)) { await bot.sendMessage(chatId, '🚫 Yetkiniz yok.'); break; }
          await bot.sendMessage(chatId, '⚠️ *Sunucu restart edilsin mi?*', {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '✅ Evet', callback_data: 'onay:sil_restart:0' }, { text: '❌ İptal', callback_data: 'onay:iptal:0' }]] },
          });
          break;
        case 'deploy':
          if (!userId || !adminMi(userId)) { await bot.sendMessage(chatId, '🚫 Yetkiniz yok.'); break; }
          await bot.sendMessage(chatId, '⚠️ *Deploy tetiklensin mi?*', {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: '✅ Evet', callback_data: 'onay:sil_deploy:0' }, { text: '❌ İptal', callback_data: 'onay:iptal:0' }]] },
          });
          break;
        default: break;
      }
    } catch (hata) {
      logger.error('Buton komut hatası:', hata);
      await bot.sendMessage(chatId, '❌ Bir hata oluştu.');
    }
  });
}

async function sunucuKomutCalistir(bot: TelegramBot, chatId: number, cmd: string, userId?: number, userName?: string): Promise<void> {
  try {
    switch (cmd) {
      case 'server_durum': {
        const dbSaglik = await db.saglik();
        const redisSaglik = await redis.saglik();
        const bellek = process.memoryUsage();
        const sureSaniye = Math.floor(process.uptime());
        const saat = Math.floor(sureSaniye / 3600);
        const dakika = Math.floor((sureSaniye % 3600) / 60);
        await bot.sendMessage(chatId,
          `🖥️ *Sunucu Durumu*\n\n` +
          `🟢 Bot: Çalışıyor\n` +
          `${dbSaglik ? '🟢' : '🔴'} PostgreSQL: ${dbSaglik ? 'Bağlı' : 'YOK'}\n` +
          `${redisSaglik ? '🟢' : '🔴'} Redis: ${redisSaglik ? 'Bağlı' : 'YOK'}\n` +
          `⏱️ Uptime: ${saat}s ${dakika}dk\n` +
          `💾 RAM: ${Math.round(bellek.heapUsed / 1024 / 1024)}MB\n` +
          `📅 ${new Date().toLocaleString('tr-TR')}`,
          { parse_mode: 'Markdown' });
        break;
      }
      case 'server_saglik': {
        const kontroller = [
          { ad: 'Bot API', durum: true },
          { ad: 'PostgreSQL', durum: await db.saglik() },
          { ad: 'Redis', durum: await redis.saglik() },
        ];
        const tamami = kontroller.every(k => k.durum);
        await bot.sendMessage(chatId,
          `${tamami ? '💚' : '❤️'} *Sağlık*\n\n${kontroller.map(k => `${k.durum ? '✅' : '❌'} ${k.ad}`).join('\n')}`,
          { parse_mode: 'Markdown' });
        break;
      }
      case 'server_log': {
        const { stdout } = await execAsync('tail -n 20 logs/sistem.log 2>/dev/null || echo "Log bulunamadı"');
        await bot.sendMessage(chatId, `📋 *Log*\n\n\`\`\`\n${stdout.slice(-3000)}\n\`\`\``, { parse_mode: 'Markdown' });
        break;
      }
      case 'server_restart':
        if (userId) await auditService.kaydet(userId, userName || '', 'restart_tetiklendi');
        await bot.sendMessage(chatId, '♻️ Restart...');
        setTimeout(() => process.exit(0), 1000);
        break;
      case 'deploy': {
        if (userId) await auditService.kaydet(userId, userName || '', 'deploy_tetiklendi');
        await bot.sendMessage(chatId, '⏳ Deploy...');
        const ok = await deployService.tetikle();
        await bot.sendMessage(chatId, ok
          ? deployService.formatMesaj({ proje: 'UstaGo', branch: 'main', yapan: userName || 'Buton', durum: 'basliyor' }, 'Başlatıldı')
          : '❌ Deploy tetiklenemedi.');
        break;
      }
    }
  } catch (hata) {
    logger.error('Sunucu hatası:', hata);
    await bot.sendMessage(chatId, '❌ Komut çalıştırılamadı.');
  }
}

async function exportGonder(bot: TelegramBot, chatId: number, format: 'md' | 'csv' | 'json'): Promise<void> {
  try {
    let icerik: string;
    let ext: string;
    if (format === 'md') { icerik = await gorevService.exportMarkdown(); ext = 'md'; }
    else if (format === 'csv') { icerik = await gorevService.exportCSV(); ext = 'csv'; }
    else { icerik = await gorevService.exportJSON(); ext = 'json'; }

    const dosyaAdi = `gorevler-${new Date().toISOString().slice(0, 10)}.${ext}`;
    const dir = path.join(process.cwd(), 'exports');
    fs.mkdirSync(dir, { recursive: true });
    const dosyaYolu = path.join(dir, dosyaAdi);
    fs.writeFileSync(dosyaYolu, icerik, 'utf-8');
    await bot.sendDocument(chatId, dosyaYolu, { caption: `📤 ${ext.toUpperCase()} export` });
    try { fs.unlinkSync(dosyaYolu); } catch {}
  } catch (hata) {
    logger.error('Export hatası:', hata);
    await bot.sendMessage(chatId, '❌ Export başarısız.');
  }
}

async function bugunNeVarCalistir(bot: TelegramBot, chatId: number): Promise<void> {
  try {
    const [gorevler, buglar, standuplar, nobet] = await Promise.all([
      gorevService.liste(), bugService.liste(), Promise.resolve(standupBugunTumunuGetir()), nobetService.bugunGetir(),
    ]);
    let metin = `☀️ *Bugün Ne Var?*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    metin += `📋 *Görevler:* ${gorevler.length}\n`;
    gorevler.slice(0, 3).forEach(g => { metin += `   • #${g.id} ${g.metin}\n`; });
    if (gorevler.length > 3) metin += `   _+${gorevler.length - 3} daha_\n`;
    metin += `\n🐞 *Buglar:* ${buglar.length}\n`;
    buglar.slice(0, 2).forEach((b: any) => { metin += `   • #${b.id} ${(b.aciklama || '').slice(0, 40)}\n`; });
    metin += `\n📋 *Standup:* ${standuplar.length} kişi\n`;
    standuplar.forEach(s => { metin += `   • ${s.ad}: ${(s.plan || '').slice(0, 50)}\n`; });
    if (nobet) metin += `\n👮 *Nöbetçi:* ${nobet.kullanici_ad}\n`;
    metin += `\n━━━━━━━━━━━━━━━━━━━━━━`;
    await bot.sendMessage(chatId, metin, { parse_mode: 'Markdown' });
  } catch (hata) {
    logger.error('Bugün ne var hatası:', hata);
    await bot.sendMessage(chatId, '❌ Özet alınamadı.');
  }
}

async function ekstraChangelogCalistir(bot: TelegramBot, chatId: number): Promise<void> {
  try {
    await bot.sendMessage(chatId, '📝 Changelog hazırlanıyor...');
    const sonuc = await db.query(`SELECT proje, branch, commit_msg, yapan, olusturuldu FROM deployler ORDER BY olusturuldu DESC LIMIT 10`);
    if (!sonuc.rows.length) { await bot.sendMessage(chatId, '📭 Deploy kaydı yok.'); return; }
    const cl = sonuc.rows.map((r: any, i: number) => `${i + 1}. [${new Date(r.olusturuldu).toLocaleDateString('tr-TR')}] ${r.proje}/${r.branch}: ${r.commit_msg}`).join('\n');
    const analiz = await claudeSor(`Son commit geçmişini analiz et. Kısa özet yaz:\n\n${cl}`);
    await bot.sendMessage(chatId, `📝 *Changelog*\n\n\`\`\`\n${cl}\n\`\`\`\n\n🤖 ${analiz}`, { parse_mode: 'Markdown' });
  } catch (hata) {
    logger.error('Changelog hatası:', hata);
    await bot.sendMessage(chatId, '❌ Changelog alınamadı.');
  }
}

async function retroCalistir(bot: TelegramBot, chatId: number): Promise<void> {
  try {
    await bot.sendMessage(chatId, '🔄 Retrospektif...');
    const [g, b, d] = await Promise.all([
      db.query(`SELECT metin FROM gorevler WHERE tamamlandi >= NOW() - INTERVAL '7 days'`),
      db.query(`SELECT aciklama, durum FROM bug_raporlari WHERE olusturuldu >= NOW() - INTERVAL '7 days'`),
      db.query(`SELECT commit_msg FROM deployler WHERE olusturuldu >= NOW() - INTERVAL '7 days' LIMIT 10`),
    ]);
    const ozet = `Tamamlanan: ${g.rows.map((r: any) => r.metin).join('; ')}\nBuglar: ${b.rows.map((r: any) => r.aciklama).join('; ')}\nDeploy: ${d.rows.map((r: any) => r.commit_msg).join('; ')}`;
    const analiz = await claudeSor(`Sprint retrospektifi: 1) İyi giden 2) Geliştirilebilir 3) 2-3 aksiyon\n\n${ozet}`);
    await bot.sendMessage(chatId, `📋 *Retrospektif*\n\n${analiz}`, { parse_mode: 'Markdown' });
  } catch { await bot.sendMessage(chatId, '❌ Retro oluşturulamadı.'); }
}

async function ekstraServislerCalistir(bot: TelegramBot, chatId: number): Promise<void> {
  try {
    const servisler = servisleriGetir();
    let metin = `🖥️ *Servisler*\n\n`;
    for (const s of servisler) {
      const d = s.sonDurum === null ? '⏳' : s.sonDurum ? '🟢' : '🔴';
      metin += `${d} *${s.ad}*\n`;
    }
    await bot.sendMessage(chatId, metin, { parse_mode: 'Markdown' });
  } catch { await bot.sendMessage(chatId, '❌ Servis durumu alınamadı.'); }
}
