"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceHandleriniKaydet = voiceHandleriniKaydet;
const config_1 = require("../../config");
const claudeAI_1 = require("../../integrations/claudeAI");
const whisperAI_1 = require("../../integrations/whisperAI");
const logger_1 = require("../../utils/logger");
/**
 * Sesli mesajı transkribe edip AI'ya sorar
 */
function voiceHandleriniKaydet(bot) {
    bot.on('voice', async (mesaj) => {
        if (!config_1.config.openai.apiKey) {
            bot.sendMessage(mesaj.chat.id, '⚠️ Sesli mesaj özelliği için OPENAI_API_KEY tanımlanmalı.');
            return;
        }
        const fileId = mesaj.voice?.file_id;
        if (!fileId)
            return;
        try {
            const durum = await bot.sendMessage(mesaj.chat.id, '🎤 Ses işleniyor...');
            const dosya = await bot.getFile(fileId);
            const url = `https://api.telegram.org/file/bot${config_1.config.telegram.token}/${dosya.file_path}`;
            const axios = (await Promise.resolve().then(() => __importStar(require('axios')))).default;
            const { data } = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(data);
            const transkript = await (0, whisperAI_1.sesdenMetne)(buffer);
            if (transkript.startsWith('⚠️')) {
                await bot.editMessageText(transkript, { chat_id: mesaj.chat.id, message_id: durum.message_id });
                return;
            }
            await bot.editMessageText(`📝 *Söylediğin:* ${transkript}\n\n🤖 Düşünüyorum...`, {
                chat_id: mesaj.chat.id,
                message_id: durum.message_id,
                parse_mode: 'Markdown',
            });
            const yanit = await (0, claudeAI_1.claudeSor)(transkript);
            await bot.editMessageText(`📝 *Söylediğin:* ${transkript}\n\n🤖 *AI Yanıtı:*\n${yanit}`, {
                chat_id: mesaj.chat.id,
                message_id: durum.message_id,
                parse_mode: 'Markdown',
            });
        }
        catch (hata) {
            logger_1.logger.error('Voice handler hatası:', hata);
            bot.sendMessage(mesaj.chat.id, '❌ Ses işlenemedi. Lütfen tekrar deneyin.');
        }
    });
}
//# sourceMappingURL=voiceHandler.js.map