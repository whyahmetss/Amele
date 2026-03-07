import TelegramBot from 'node-telegram-bot-api';
import { exec } from 'child_process';
import { promisify } from 'util';
import { adminGerekli } from '../middlewares/auth';
import { db } from '../../models/database';
import { redis } from '../../models/redis';
import { deployService } from '../../services/deployService';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

export function sunucuKomutlariniKaydet(bot: TelegramBot): void {

  // /server durum
  bot.onText(/^\/server durum/i, async (mesaj) => {
    adminGerekli(bot, mesaj, async () => {
      try {
        const dbSaglik = await db.saglik();
        const redisSaglik = await redis.saglik();
        const bellek = process.memoryUsage();
        const sureSaniye = Math.floor(process.uptime());
        const saat = Math.floor(sureSaniye / 3600);
        const dakika = Math.floor((sureSaniye % 3600) / 60);

        bot.sendMessage(
          mesaj.chat.id,
          `🖥️ *Sunucu Durumu*\n\n` +
          `🟢 Bot: Çalışıyor\n` +
          `${dbSaglik ? '🟢' : '🔴'} PostgreSQL: ${dbSaglik ? 'Bağlı' : 'BAĞLANTI YOK'}\n` +
          `${redisSaglik ? '🟢' : '🔴'} Redis: ${redisSaglik ? 'Bağlı' : 'BAĞLANTI YOK'}\n` +
          `⏱️ Çalışma Süresi: ${saat}s ${dakika}dk\n` +
          `💾 RAM Kullanımı: ${Math.round(bellek.heapUsed / 1024 / 1024)}MB\n` +
          `📅 Zaman: ${new Date().toLocaleString('tr-TR')}`,
          { parse_mode: 'Markdown' }
        );
      } catch (hata) {
        logger.error('Sunucu durum hatası:', hata);
        bot.sendMessage(mesaj.chat.id, '❌ Durum bilgisi alınamadı.');
      }
    });
  });

  // /server sağlık
  bot.onText(/^\/server sa[gğ]l[iı]k/i, async (mesaj) => {
    adminGerekli(bot, mesaj, async () => {
      const kontroller = [
        { ad: 'Bot API', durum: true },
        { ad: 'PostgreSQL', durum: await db.saglik() },
        { ad: 'Redis', durum: await redis.saglik() },
      ];

      const satirlar = kontroller.map(
        (k) => `${k.durum ? '✅' : '❌'} ${k.ad}`
      );

      const tamami = kontroller.every((k) => k.durum);
      bot.sendMessage(
        mesaj.chat.id,
        `${tamami ? '💚' : '❤️'} *Sistem Sağlık Raporu*\n\n${satirlar.join('\n')}`,
        { parse_mode: 'Markdown' }
      );
    });
  });

  // /server log
  bot.onText(/^\/server log/i, async (mesaj) => {
    adminGerekli(bot, mesaj, async () => {
      try {
        const { stdout } = await execAsync('tail -n 20 logs/sistem.log 2>/dev/null || echo "Log dosyası bulunamadı"');
        const kisaltilmis = stdout.slice(-3000); // Telegram limiti
        bot.sendMessage(
          mesaj.chat.id,
          `📋 *Son 20 Log Satırı*\n\n\`\`\`\n${kisaltilmis}\n\`\`\``,
          { parse_mode: 'Markdown' }
        );
      } catch (hata) {
        bot.sendMessage(mesaj.chat.id, '❌ Log okunamadı.');
      }
    });
  });

  // /server restart
  bot.onText(/^\/server restart/i, async (mesaj) => {
    adminGerekli(bot, mesaj, async () => {
      bot.sendMessage(mesaj.chat.id, '♻️ Sunucu yeniden başlatılıyor...');
      logger.info(`Sunucu restart komutu: kullanıcı ${mesaj.from?.id}`);
      setTimeout(() => process.exit(0), 1000); // Docker/PM2 yeniden başlatır
    });
  });

  // /deploy
  bot.onText(/^\/deploy$/i, async (mesaj) => {
    adminGerekli(bot, mesaj, async () => {
      bot.sendMessage(mesaj.chat.id, '⏳ Deploy tetikleniyor...');
      const basarili = await deployService.tetikle();

      if (basarili) {
        bot.sendMessage(
          mesaj.chat.id,
          deployService.formatMesaj(
            { proje: 'UstaGo', branch: 'main', yapan: mesaj.from?.first_name, durum: 'basliyor' },
            'Başlatıldı'
          ),
          { parse_mode: 'Markdown' }
        );
      } else {
        bot.sendMessage(mesaj.chat.id, '❌ Deploy tetiklenemedi. RENDER_DEPLOY_HOOK kontrol edin.');
      }
    });
  });
}
