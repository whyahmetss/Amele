import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export async function claudeSor(soru: string): Promise<string> {
  if (!config.claude.apiKey) {
    return '⚠️ Claude API anahtarı tanımlanmamış.';
  }

  try {
    const yanit = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Sen UstaGo projesinin AI asistanısın. Türkçe, kısa ve net cevap ver.\n\nSoru: ${soru}`,
          },
        ],
      },
      {
        headers: {
          'x-api-key': config.claude.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const icerik = yanit.data?.content?.[0]?.text;
    return icerik || '⚠️ Yanıt alınamadı.';
  } catch (hata: any) {
    logger.error('Claude API hatası:', hata?.response?.data || hata.message);
    return `⚠️ AI yanıt hatası: ${hata.message}`;
  }
}
