import TelegramBot from 'node-telegram-bot-api';
import { gorevService } from '../../services/gorevService';
import { bugService } from '../../services/bugService';
import { db } from '../../models/database';
import { redis } from '../../models/redis';
import { deployService } from '../../services/deployService';
import { servisleriGetir } from '../../services/renderIzleme';
import { claudeSor } from '../../integrations/claudeAI';
import { standupGetir, standupBugunTumunuGetir } from '../../jobs/gunlukRapor';
import { nobetService } from '../../services/nobetService';
import { issueOlustur } from '../../services/githubService';
import { adminMi } from '../middlewares/auth';
import { logger } from '../../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const YARDIM_METNI =
  `🛠️ *UstaGo Geliştirici Bot*\n` +
  `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
  `Komutlar için aşağıdaki butonları kullanabilirsiniz.\n\n` +
  `━━━━━━━━━━━━━━━━━━━━━━\n` +
  `_UstaGo v1.0 · Türkçe_`;

const INLINE_KEYBOARD: TelegramBot.InlineKeyboardButton[][] = [
  [
    { text: '☀️ Bugün Ne Var?', callback_data: 'cmd:bugun_ne_var' },
  ],
  [
    { text: '📋 Görev Listesi', callback_data: 'cmd:gorev_liste' },
    { text: '📊 İstatistik', callback_data: 'cmd:gorev_istatistik' },
  ],
  [
    { text: '➕ Görev Ekle', callback_data: 'cmd:gorev_ekle' },
    { text: '✓ Bitir', callback_data: 'cmd:gorev_bitir' },
    { text: '🗑 Sil', callback_data: 'cmd:gorev_sil' },
  ],
  [
    { text: '🐞 Bug Raporu', callback_data: 'cmd:bug' },
    { text: '🤖 AI Sor', callback_data: 'cmd:ai' },
  ],
  [
    { text: '📋 Standup', callback_data: 'cmd:standup' },
    { text: '📝 Changelog', callback_data: 'cmd:changelog' },
    { text: '🔄 Retro', callback_data: 'cmd:retro' },
    { text: '🖥 Servisler', callback_data: 'cmd:servisler' },
  ],
  [
    { text: '👮 Nöbet', callback_data: 'cmd:nobet' },
  ],
  [
    { text: '📈 Sinyal LONG', callback_data: 'cmd:sinyal_long' },
    { text: '📉 Sinyal SHORT', callback_data: 'cmd:sinyal_short' },
  ],
  [
    { text: '🖥 Durum', callback_data: 'cmd:server_durum' },
    { text: '💚 Sağlık', callback_data: 'cmd:server_saglik' },
    { text: '📋 Log', callback_data: 'cmd:server_log' },
  ],
  [
    { text: '♻️ Restart', callback_data: 'cmd:server_restart' },
    { text: '🚀 Deploy', callback_data: 'cmd:deploy' },
  ],
];

export function genelKomutlariniKaydet(bot: TelegramBot): void {

  // /start veya /yardim
  bot.onText(/^\/(start|yardim)/i, (mesaj) => {
    bot.sendMessage(mesaj.chat.id, YARDIM_METNI, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: INLINE_KEYBOARD },
    });
  });

  // Buton tıklamaları
  bot.on('callback_query', async (callback) => {
    const data = callback.data;
    if (!data) return;

    const chatId = callback.message?.chat?.id;
    const userId = callback.from?.id;
    if (!chatId) return;

    await bot.answerCallbackQuery(callback.id);

    // GitHub issue oluştur
    if (data.startsWith('github:')) {
      const [, tip, idStr] = data.split(':');
      const ghId = parseInt(idStr || '0');
      if (!chatId || !ghId) return;
      try {
        if (tip === 'gorev') {
          const r = await db.query<{ metin: string; ekleyen_ad: string }>('SELECT metin, ekleyen_ad FROM gorevler WHERE id = $1', [ghId]);
          const g = r.rows[0];
          if (g) {
            const sonuc = await issueOlustur(`[Görev #${ghId}] ${g.metin}`, `Görev: ${g.metin}\n\nEkleyen: ${g.ekleyen_ad}`);
            await bot.sendMessage(chatId, sonuc.url ? `✅ GitHub issue: ${sonuc.url}` : `❌ ${sonuc.hata}`);
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

    if (!data.startsWith('cmd:')) return;

    const cmd = data.replace('cmd:', '');

    try {
      switch (cmd) {
        case 'bugun_ne_var':
          await bugunNeVarCalistir(bot, chatId);
          break;
        case 'gorev_liste': {
          const gorevler = await gorevService.liste();
          const metin = gorevService.formatListeMesaji(gorevler);
          await bot.sendMessage(chatId, metin, { parse_mode: 'Markdown' });
          break;
        }
        case 'gorev_istatistik': {
          const { satirlar } = await gorevService.istatistik();
          await bot.sendMessage(chatId, satirlar, { parse_mode: 'Markdown' });
          break;
        }
        case 'gorev_ekle':
          await bot.sendMessage(chatId, '📝 Görev eklemek için:\n`/gorev ekle <metin>`\n`/gorev dogal Yarın Login düzelt` (AI parse)\n\nVeya mesaja yanıt verip `gorev` yazın.', { parse_mode: 'Markdown' });
          break;
        case 'gorev_bitir':
          await bot.sendMessage(chatId, '✓ Görev bitirmek için:\n`/gorev bitir <id>`\n\nÖrn: `/gorev bitir 3`', { parse_mode: 'Markdown' });
          break;
        case 'gorev_sil':
          await bot.sendMessage(chatId, '🗑 Görev silmek için:\n`/gorev sil <id>`\n\nÖrn: `/gorev sil 3`', { parse_mode: 'Markdown' });
          break;
        case 'bug':
          await bot.sendMessage(chatId, '🐞 Bug raporlamak için:\n`/bug <açıklama>`\n\nÖrn: `/bug Login iOS\'ta çalışmıyor`', { parse_mode: 'Markdown' });
          break;
        case 'ai':
          await bot.sendMessage(chatId, '🤖 AI\'ya sormak için:\n`/ai <soru>`\n\nÖrn: `/ai Redis nasıl kullanılır?`', { parse_mode: 'Markdown' });
          break;
        case 'sinyal_long':
        case 'sinyal_short': {
          const yon = cmd === 'sinyal_long' ? 'LONG' : 'SHORT';
          await bot.sendMessage(chatId, `📈 Sinyal göndermek için:\n\`/sinyal ${yon} <sembol>\`\n\nÖrn: \`/sinyal ${yon} BTC\``, { parse_mode: 'Markdown' });
          break;
        }
        case 'standup': {
          const mevcut = userId ? standupGetir(userId) : null;
          if (mevcut) {
            await bot.sendMessage(chatId,
              `📋 *Bugünkü Standup'ın*\n\n` +
              `📌 Plan: ${mevcut.plan}\n` +
              `✅ Tamamlanan: ${mevcut.tamamlanan.join(', ') || 'Henüz yok'}\n\n` +
              `Tamamlanan eklemek için: \`/standup bitti <ne yaptın>\``,
              { parse_mode: 'Markdown' }
            );
          } else {
            await bot.sendMessage(chatId, '📝 Kullanım:\n`/standup bugün ne yapacaksın`\n`/standup bitti ne yaptın`', { parse_mode: 'Markdown' });
          }
          break;
        }
        case 'changelog':
          await ekstraChangelogCalistir(bot, chatId);
          break;
        case 'retro':
          await retroCalistir(bot, chatId);
          break;
        case 'servisler':
          await ekstraServislerCalistir(bot, chatId);
          break;
        case 'nobet': {
          const nobet = await nobetService.bugunGetir();
          if (!nobet) {
            await bot.sendMessage(chatId, '📅 Bugün için nöbet atanmamış.');
          } else {
            await bot.sendMessage(chatId, `👮 *Bugünkü Nöbetçi*\n\n🕐 ${nobet.tarih}\n👤 ${nobet.kullanici_ad}`, { parse_mode: 'Markdown' });
          }
          break;
        }
        case 'server_durum':
        case 'server_saglik':
        case 'server_log':
        case 'server_restart':
        case 'deploy': {
          if (!userId || !adminMi(userId)) {
            await bot.sendMessage(chatId, '🚫 Bu komutu kullanma yetkiniz yok.\nSadece adminler kullanabilir.');
            return;
          }
          await sunucuKomutCalistir(bot, chatId, cmd);
          break;
        }
        default:
          break;
      }
    } catch (hata) {
      logger.error('Buton komut hatası:', hata);
      await bot.sendMessage(chatId, '❌ Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  });
}

async function sunucuKomutCalistir(bot: TelegramBot, chatId: number, cmd: string): Promise<void> {
  try {
    switch (cmd) {
      case 'server_durum': {
        const dbSaglik = await db.saglik();
        const redisSaglik = await redis.saglik();
        const bellek = process.memoryUsage();
        const sureSaniye = Math.floor(process.uptime());
        const saat = Math.floor(sureSaniye / 3600);
        const dakika = Math.floor((sureSaniye % 3600) / 60);
        await bot.sendMessage(
          chatId,
          `🖥️ *Sunucu Durumu*\n\n` +
          `🟢 Bot: Çalışıyor\n` +
          `${dbSaglik ? '🟢' : '🔴'} PostgreSQL: ${dbSaglik ? 'Bağlı' : 'BAĞLANTI YOK'}\n` +
          `${redisSaglik ? '🟢' : '🔴'} Redis: ${redisSaglik ? 'Bağlı' : 'BAĞLANTI YOK'}\n` +
          `⏱️ Çalışma Süresi: ${saat}s ${dakika}dk\n` +
          `💾 RAM Kullanımı: ${Math.round(bellek.heapUsed / 1024 / 1024)}MB\n` +
          `📅 Zaman: ${new Date().toLocaleString('tr-TR')}`,
          { parse_mode: 'Markdown' }
        );
        break;
      }
      case 'server_saglik': {
        const kontroller = [
          { ad: 'Bot API', durum: true },
          { ad: 'PostgreSQL', durum: await db.saglik() },
          { ad: 'Redis', durum: await redis.saglik() },
        ];
        const satirlar = kontroller.map((k) => `${k.durum ? '✅' : '❌'} ${k.ad}`);
        const tamami = kontroller.every((k) => k.durum);
        await bot.sendMessage(
          chatId,
          `${tamami ? '💚' : '❤️'} *Sistem Sağlık Raporu*\n\n${satirlar.join('\n')}`,
          { parse_mode: 'Markdown' }
        );
        break;
      }
      case 'server_log': {
        const { stdout } = await execAsync('tail -n 20 logs/sistem.log 2>/dev/null || echo "Log dosyası bulunamadı"');
        const kisaltilmis = stdout.slice(-3000);
        await bot.sendMessage(chatId, `📋 *Son 20 Log Satırı*\n\n\`\`\`\n${kisaltilmis}\n\`\`\``, { parse_mode: 'Markdown' });
        break;
      }
      case 'server_restart': {
        await bot.sendMessage(chatId, '♻️ Sunucu yeniden başlatılıyor...');
        logger.info('Sunucu restart komutu: buton ile tetiklendi');
        setTimeout(() => process.exit(0), 1000);
        break;
      }
      case 'deploy': {
        await bot.sendMessage(chatId, '⏳ Deploy tetikleniyor...');
        const basarili = await deployService.tetikle();
        if (basarili) {
          await bot.sendMessage(
            chatId,
            deployService.formatMesaj(
              { proje: 'UstaGo', branch: 'main', yapan: 'Buton', durum: 'basliyor' },
              'Başlatıldı'
            ),
            { parse_mode: 'Markdown' }
          );
        } else {
          await bot.sendMessage(chatId, '❌ Deploy tetiklenemedi. RENDER_DEPLOY_HOOK kontrol edin.');
        }
        break;
      }
    }
  } catch (hata) {
    logger.error('Sunucu komut hatası:', hata);
    await bot.sendMessage(chatId, '❌ Komut çalıştırılamadı.');
  }
}

async function bugunNeVarCalistir(bot: TelegramBot, chatId: number): Promise<void> {
  try {
    const [gorevler, buglar, standuplar, nobet] = await Promise.all([
      gorevService.liste(),
      bugService.liste(),
      Promise.resolve(standupBugunTumunuGetir()),
      nobetService.bugunGetir(),
    ]);

    let metin = `☀️ *Bugün Ne Var?*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    metin += `📋 *Aktif Görevler:* ${gorevler.length}\n`;
    if (gorevler.length) {
      gorevler.slice(0, 3).forEach((g) => {
        metin += `   • #${g.id} ${g.metin}\n`;
      });
      if (gorevler.length > 3) metin += `   _+${gorevler.length - 3} daha_\n`;
    }

    metin += `\n🐞 *Açık Buglar:* ${buglar.length}\n`;
    if (buglar.length) {
        buglar.slice(0, 2).forEach((b: { id: number; aciklama: string }) => {
          const a = (b.aciklama || '').slice(0, 40);
          metin += `   • #${b.id} ${a}${(b.aciklama || '').length > 40 ? '...' : ''}\n`;
        });
    }

    metin += `\n📋 *Standup:* ${standuplar.length} kişi\n`;
    standuplar.forEach((s) => {
      const p = (s.plan || '').slice(0, 50);
      metin += `   • ${s.ad}: ${p}${(s.plan || '').length > 50 ? '...' : ''}\n`;
    });

    if (nobet) {
      metin += `\n👮 *Nöbetçi:* ${nobet.kullanici_ad}\n`;
    }
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
    const sonuc = await db.query(`
      SELECT proje, branch, commit_msg, yapan, olusturuldu
      FROM deployler
      ORDER BY olusturuldu DESC
      LIMIT 10
    `);

    if (!sonuc.rows.length) {
      await bot.sendMessage(chatId, '📭 Henüz deploy kaydı yok.');
      return;
    }

    const commitListesi = sonuc.rows.map((r: { proje: string; branch: string; commit_msg: string; yapan: string; olusturuldu: string }, i: number) => {
      const tarih = new Date(r.olusturuldu).toLocaleDateString('tr-TR');
      return `${i + 1}. [${tarih}] ${r.proje}/${r.branch}: ${r.commit_msg} (${r.yapan})`;
    }).join('\n');

    const analiz = await claudeSor(
      `Aşağıdaki son commit geçmişini analiz et. Ne tür değişiklikler yapıldı? Önemli gelişmeler var mı? Kısa özet yaz:\n\n${commitListesi}`
    );

    await bot.sendMessage(chatId,
      `📝 *Changelog & Analiz*\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `*Son Commitler:*\n\`\`\`\n${commitListesi}\n\`\`\`\n\n` +
      `🤖 *AI Özeti:*\n${analiz}`,
      { parse_mode: 'Markdown' }
    );
  } catch (hata) {
    logger.error('Changelog hatası:', hata);
    await bot.sendMessage(chatId, '❌ Changelog alınamadı.');
  }
}

async function retroCalistir(bot: TelegramBot, chatId: number): Promise<void> {
  try {
    await bot.sendMessage(chatId, '🔄 Retrospektif hazırlanıyor...');
    const [gorevler, buglar, deployler] = await Promise.all([
      db.query(`SELECT metin, ekleyen_ad FROM gorevler WHERE tamamlandi >= NOW() - INTERVAL '7 days'`),
      db.query(`SELECT aciklama, durum, bildiren_ad FROM bug_raporlari WHERE olusturuldu >= NOW() - INTERVAL '7 days'`),
      db.query(`SELECT commit_msg, yapan FROM deployler WHERE olusturuldu >= NOW() - INTERVAL '7 days' LIMIT 10`),
    ]);
    const ozet = [
      'Tamamlanan: ' + gorevler.rows.map((r: any) => r.metin).join('; '),
      'Buglar: ' + buglar.rows.map((r: any) => r.aciklama + ' [' + r.durum + ']').join('; '),
      'Deploylar: ' + deployler.rows.map((r: any) => r.commit_msg).join('; '),
    ].join('\n');
    const analiz = await claudeSor(
      `Son 1 haftalık sprint verisi. Retrospektif: 1) Ne iyi gitti? 2) Ne geliştirilebilir? 3) 2-3 aksiyon öner. Kısa ve net ol.\n\n${ozet}`
    );
    await bot.sendMessage(chatId, `📋 *Sprint Retrospektifi*\n━━━━━━━━━━━━━━━━━━━━━━\n\n${analiz}`, { parse_mode: 'Markdown' });
  } catch (hata) {
    logger.error('Retro hatası:', hata);
    await bot.sendMessage(chatId, '❌ Retrospektif oluşturulamadı.');
  }
}

async function ekstraServislerCalistir(bot: TelegramBot, chatId: number): Promise<void> {
  try {
    const servisler = servisleriGetir();
    let metin = `🖥️ *Servis Durumu*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const s of servisler) {
      const durum = s.sonDurum === null ? '⏳ Kontrol edilmedi' : s.sonDurum ? '🟢 Çevrimiçi' : '🔴 Çevrimdışı';
      const kontrol = s.sonKontrol ? new Date(s.sonKontrol).toLocaleTimeString('tr-TR') : '-';
      metin += `${durum} *${s.ad}*\nSon kontrol: ${kontrol}\n\n`;
    }
    metin += `_Her 5 dakikada otomatik kontrol edilir_`;
    await bot.sendMessage(chatId, metin, { parse_mode: 'Markdown' });
  } catch (hata) {
    logger.error('Servisler hatası:', hata);
    await bot.sendMessage(chatId, '❌ Servis durumu alınamadı.');
  }
}
