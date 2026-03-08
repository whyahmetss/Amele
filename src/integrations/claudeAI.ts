import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export async function claudeSor(soru: string): Promise<string> {
  if (!config.deepseek.apiKey) {
    return '⚠️ Deepseek API anahtarı tanımlanmamış.';
  }

  try {
    const yanit = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
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
      },
      {
        headers: {
          'Authorization': `Bearer ${config.deepseek.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return yanit.data?.choices?.[0]?.message?.content || '⚠️ Yanıt alınamadı.';
  } catch (hata: any) {
    logger.error('Deepseek API hatası:', hata?.response?.data || hata.message);
    return `⚠️ AI yanıt hatası: ${hata.message}`;
  }
}
