import axios from 'axios';
import FormData from 'form-data';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Sesli mesajı metne çevirir (OpenAI Whisper API)
 */
export async function sesdenMetne(audioBuffer: Buffer): Promise<string> {
  if (!config.openai.apiKey) {
    return '⚠️ OpenAI API anahtarı tanımlı değil (OPENAI_API_KEY). Sesli mesaj özelliği kullanılamaz.';
  }

  try {
    const form = new FormData();
    form.append('file', audioBuffer, { filename: 'voice.ogg', contentType: 'audio/ogg' });
    form.append('model', 'whisper-1');
    form.append('language', 'tr');

    const { data } = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${config.openai.apiKey}`,
      },
      timeout: 30000,
      maxBodyLength: 25 * 1024 * 1024,
      maxContentLength: 25 * 1024 * 1024,
    });

    return (data?.text || '').trim() || 'Metin çıkarılamadı.';
  } catch (hata: any) {
    logger.error('Whisper API hatası:', hata?.response?.data || hata.message);
    return `⚠️ Ses işleme hatası: ${hata.message}`;
  }
}
