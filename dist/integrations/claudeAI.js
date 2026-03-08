"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeSor = claudeSor;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
async function claudeSor(soru) {
    if (!config_1.config.deepseek.apiKey) {
        return '⚠️ Deepseek API anahtarı tanımlanmamış.';
    }
    try {
        const yanit = await axios_1.default.post('https://api.deepseek.com/chat/completions', {
            model: 'deepseek-chat',
            max_tokens: 1024,
            messages: [
                {
                    role: 'system',
                    content: 'Sen UstaGo projesinin AI asistanısın. Adın Amele. Türkçe, kısa ve net cevap ver. Samimi ve esprili ol.'
                },
                {
                    role: 'user',
                    content: soru,
                },
            ],
        }, {
            headers: {
                'Authorization': `Bearer ${config_1.config.deepseek.apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
        return yanit.data?.choices?.[0]?.message?.content || '⚠️ Yanıt alınamadı.';
    }
    catch (hata) {
        logger_1.logger.error('Deepseek API hatası:', hata?.response?.data || hata.message);
        return `⚠️ AI yanıt hatası: ${hata.message}`;
    }
}
//# sourceMappingURL=claudeAI.js.map