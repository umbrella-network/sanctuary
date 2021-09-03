import winston, { Logger, format } from 'winston';

const { combine, timestamp, colorize } = format;

const logger: Logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    // errors({ stack: true }), // <-- use errors format
    colorize(),
    timestamp()
  ),
  transports: [new winston.transports.Console()],
  defaultMeta: true
});

export default logger;
