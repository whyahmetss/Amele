import TelegramBot from 'node-telegram-bot-api';
export declare function botOlustur(): TelegramBot;
export declare function botAl(): TelegramBot | null;
export declare function grupaMesajGonder(metin: string, parseMode?: 'Markdown' | 'HTML'): Promise<void>;
