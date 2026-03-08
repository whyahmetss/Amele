"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sesdenMetne = sesdenMetne;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
/**
 * Sesli mesajı metne çevirir (OpenAI Whisper API)
 */
async function sesdenMetne(audioBuffer) {
    if (!config_1.config.openai.apiKey) {
        return '⚠️ OpenAI API anahtarı tanımlı değil (OPENAI_API_KEY). Sesli mesaj özelliği kullanılamaz.';
    }
    try {
        const form = new form_data_1.default();
        form.append('file', audioBuffer, { filename: 'voice.ogg', contentType: 'audio/ogg' });
        form.append('model', 'whisper-1');
        form.append('language', 'tr');
        const { data } = await axios_1.default.post('https://api.openai.com/v1/audio/transcriptions', form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${config_1.config.openai.apiKey}`,
            },
            timeout: 30000,
            maxBodyLength: 25 * 1024 * 1024,
            maxContentLength: 25 * 1024 * 1024,
        });
        return (data?.text || '').trim() || 'Metin çıkarılamadı.';
    }
    catch (hata) {
        logger_1.logger.error('Whisper API hatası:', hata?.response?.data || hata.message);
        return `⚠️ Ses işleme hatası: ${hata.message}`;
    }
}
//# sourceMappingURL=whisperAI.js.map