import TelegramBot from 'node-telegram-bot-api';

export function genelKomutlariniKaydet(bot: TelegramBot): void {

  // /start veya /yardim
  bot.onText(/^\/(start|yardim)/i, (mesaj) => {
    bot.sendMessage(
      mesaj.chat.id,
      `🛠️ *UstaGo Geliştirici Bot*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📋 *GÖREV YÖNETİMİ*\n` +
      `/gorev ekle <metin>\n` +
      `/gorev liste\n` +
      `/gorev bitir <id>\n` +
      `/gorev sil <id>\n\n` +
      `🐞 *BUG RAPORU*\n` +
      `/bug <açıklama>\n\n` +
      `🤖 *AI YARDIMCI*\n` +
      `/ai <soru>\n\n` +
      `📈 *TRADE SİNYAL*\n` +
      `/sinyal LONG|SHORT <sembol>\n\n` +
      `🖥️ *SUNUCU* _(sadece admin)_\n` +
      `/server durum\n` +
      `/server sağlık\n` +
      `/server log\n` +
      `/server restart\n` +
      `/deploy\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `_UstaGo v1.0 · Türkçe_`,
      { parse_mode: 'Markdown' }
    );
  });
}
