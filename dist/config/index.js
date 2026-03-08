"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    telegram: {
        token: process.env.TG_BOT_TOKEN || '',
        chatId: process.env.TG_CHAT_ID || '',
        adminIds: (process.env.TG_ADMIN_IDS || '').split(',').map(Number).filter(Boolean),
    },
    db: {
        url: process.env.DATABASE_URL || '',
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY || '',
    },
    github: {
        webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
        repo: process.env.GITHUB_REPO || '',
        token: process.env.GITHUB_TOKEN || '',
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '', // Sesli mesaj (Whisper) için
    },
    server: {
        port: Number(process.env.SERVER_PORT) || 3000,
        env: process.env.NODE_ENV || 'development',
    },
    deploy: {
        renderHook: process.env.RENDER_DEPLOY_HOOK || '',
    },
    security: {
        internalApiKey: process.env.INTERNAL_API_KEY || '',
        rateLimitWindow: Number(process.env.RATE_LIMIT_WINDOW) || 60000,
        rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 30,
    },
};
//# sourceMappingURL=index.js.map