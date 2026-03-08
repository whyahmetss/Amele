"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const pg_1 = require("pg");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class Veritabani {
    constructor() {
        this.pool = new pg_1.Pool({
            connectionString: config_1.config.db.url,
            ssl: { rejectUnauthorized: false },
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });
        this.pool.on('error', (hata) => {
            logger_1.logger.error('PostgreSQL bağlantı hatası:', hata);
        });
    }
    async query(sql, params) {
        const istemci = await this.pool.connect();
        try {
            const sonuc = await istemci.query(sql, params);
            return sonuc;
        }
        catch (hata) {
            logger_1.logger.error(`SQL Hatası: ${sql}`, hata);
            throw hata;
        }
        finally {
            istemci.release();
        }
    }
    async end() {
        await this.pool.end();
    }
    async saglik() {
        try {
            await this.query('SELECT 1');
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.db = new Veritabani();
//# sourceMappingURL=database.js.map