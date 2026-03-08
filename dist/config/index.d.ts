export declare const config: {
    telegram: {
        token: string;
        chatId: string;
        adminIds: number[];
    };
    db: {
        url: string;
    };
    redis: {
        url: string;
    };
    deepseek: {
        apiKey: string;
    };
    github: {
        webhookSecret: string;
        repo: string;
        token: string;
    };
    openai: {
        apiKey: string;
    };
    server: {
        port: number;
        env: string;
    };
    deploy: {
        renderHook: string;
    };
    security: {
        internalApiKey: string;
        rateLimitWindow: number;
        rateLimitMax: number;
    };
};
