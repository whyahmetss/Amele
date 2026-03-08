"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inlineHandleriniKaydet = inlineHandleriniKaydet;
const gorevService_1 = require("../../services/gorevService");
const gunlukRapor_1 = require("../../jobs/gunlukRapor");
const bugService_1 = require("../../services/bugService");
const nobetService_1 = require("../../services/nobetService");
/**
 * Inline mode: @amele_bot gorev liste gibi herhangi sohbetten çağırma
 * BotFather'da /setinline komutu ile açılmalı
 */
function inlineHandleriniKaydet(bot) {
    bot.on('inline_query', async (query) => {
        const q = (query.query || '').trim().toLowerCase();
        const results = [];
        try {
            if (q === 'gorev' || q === 'gorev liste' || q.startsWith('gorev liste')) {
                const gorevler = await gorevService_1.gorevService.liste();
                const metin = gorevService_1.gorevService.formatListeMesaji(gorevler);
                results.push({
                    type: 'article',
                    id: 'gorev_liste',
                    title: '📋 Görev Listesi',
                    description: gorevler.length > 0 ? `${gorevler.length} aktif görev` : 'Aktif görev yok',
                    input_message_content: { message_text: metin, parse_mode: 'Markdown' },
                });
            }
            else if (q === 'standup') {
                const standup = query.from?.id ? (0, gunlukRapor_1.standupGetir)(query.from.id) : null;
                const metin = standup
                    ? `📋 *Bugünkü Standup*\n\n📌 Plan: ${standup.plan}\n✅ Tamamlanan: ${standup.tamamlanan.join(', ') || '-'}`
                    : '📋 Bugün standup kaydın yok. `/standup plan` ile ekle.';
                results.push({
                    type: 'article',
                    id: 'standup',
                    title: '📋 Standup',
                    description: standup ? standup.plan : 'Standup yok',
                    input_message_content: { message_text: metin, parse_mode: 'Markdown' },
                });
            }
            else if (q === 'nobet') {
                const nobet = await nobetService_1.nobetService.bugunGetir();
                const metin = nobet
                    ? `👮 *Bugünkü Nöbetçi:* ${nobet.kullanici_ad}`
                    : '📅 Bugün nöbet atanmamış.';
                results.push({
                    type: 'article',
                    id: 'nobet',
                    title: '👮 Nöbet',
                    description: nobet ? nobet.kullanici_ad : 'Atanmamış',
                    input_message_content: { message_text: metin, parse_mode: 'Markdown' },
                });
            }
            else if (q === 'bug' || q === 'buglar') {
                const buglar = await bugService_1.bugService.liste();
                const metin = buglar.length
                    ? buglar.map((b) => `🐞 #${b.id} ${b.aciklama} (${b.bildiren_ad})`).join('\n')
                    : '✅ Açık bug yok.';
                results.push({
                    type: 'article',
                    id: 'buglar',
                    title: '🐞 Açık Buglar',
                    description: `${buglar.length} açık bug`,
                    input_message_content: { message_text: metin },
                });
            }
            else {
                results.push({
                    type: 'article',
                    id: 'yardim',
                    title: '🛠️ UstaGo Bot Yardım',
                    description: 'Komutlar: gorev, standup, nobet, buglar',
                    input_message_content: {
                        message_text: '🛠️ *UstaGo Bot*\n\nInline: `gorev` `standup` `nobet` `buglar`\n\nTam komutlar için /start',
                        parse_mode: 'Markdown',
                    },
                });
            }
            await bot.answerInlineQuery(query.id, results, { cache_time: 60 });
        }
        catch {
            await bot.answerInlineQuery(query.id, [{
                    type: 'article',
                    id: 'hata',
                    title: '❌ Hata',
                    description: 'Veri alınamadı',
                    input_message_content: { message_text: '❌ Veri alınamadı.' },
                }]);
        }
    });
}
//# sourceMappingURL=inlineHandler.js.map