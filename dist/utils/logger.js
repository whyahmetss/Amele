"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const config_1 = require("../config");
const { combine, timestamp, printf, colorize, errors } = winston_1.default.format;
const formatMesaj = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}] ${stack || message}`;
});
exports.logger = winston_1.default.createLogger({
    level: config_1.config.server.env === 'production' ? 'info' : 'debug',
    format: combine(timestamp({ format: 'DD.MM.YYYY HH:mm:ss' }), errors({ stack: true }), formatMesaj),
    transports: [
        new winston_1.default.transports.Console({
            format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), formatMesaj),
        }),
        new winston_1.default.transports.File({
            filename: 'logs/hata.log',
            level: 'error',
        }),
        new winston_1.default.transports.File({
            filename: 'logs/sistem.log',
        }),
    ],
});
//# sourceMappingURL=logger.js.map