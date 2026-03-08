import dotenv from 'dotenv';
dotenv.config();

export const config = {
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
  claude: {
    apiKey: process.env.CLAUDE_API_KEY || '',
  },
  github: {
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
    repo: process.env.GITHUB_REPO || '',
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
