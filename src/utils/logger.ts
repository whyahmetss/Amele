import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const formatMesaj = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}] ${stack || message}`;
});

export const logger = winston.createLogger({
  level: config.server.env === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'DD.MM.YYYY HH:mm:ss' }),
    errors({ stack: true }),
    formatMesaj
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), formatMesaj),
    }),
    new winston.transports.File({
      filename: 'logs/hata.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/sistem.log',
    }),
  ],
});
