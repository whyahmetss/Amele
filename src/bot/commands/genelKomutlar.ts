import TelegramBot from 'node-telegram-bot-api';
import { gorevService } from '../../services/gorevService';
import { db } from '../../models/database';
import { redis } from '../../models/redis';
import { deployService } from '../../services/deployService';
import { servisleriGetir } from '../../services/renderIzleme';
import { claudeSor } from '../../integrations/claudeAI';
import { standupGetir } from '../../jobs/gunlukRapor';
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
    { text: '📋 Görev Listesi', callback_data: 'cmd:gorev_liste' },
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
    { text: '🖥 Servisler', callback_data: 'cmd:servisler' },
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
    if (!data?.startsWith('cmd:')) return;

    const chatId = callback.message?.chat?.id;
    const userId = callback.from?.id;
    if (!chatId) return;

    const cmd = data.replace('cmd:', '');
    await bot.answerCallbackQuery(callback.id);

    try {
      switch (cmd) {
        case 'gorev_liste': {
          const gorevler = await gorevService.liste();
          const metin = gorevService.formatListeMesaji(gorevler);
          await bot.sendMessage(chatId, metin, { parse_mode: 'Markdown' });
          break;
        }
        case 'gorev_ekle':
          await bot.sendMessage(chatId, '📝 Görev eklemek için:\n`/gorev ekle <metin>`\n\nÖrn: `/gorev ekle Login API düzelt`', { parse_mode: 'Markdown' });
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
        case 'servisler':
          await ekstraServislerCalistir(bot, chatId);
          break;
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
