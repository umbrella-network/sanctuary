import winston, { Logger, format } from 'winston';

const { combine, timestamp, prettyPrint, colorize, errors } = format;

const logger: Logger = winston.createLogger({
  level: 'silly', //  process.env.LOG_LEVEL || 'info',
  format: combine(
    // errors({ stack: true }), // <-- use errors format
    colorize(),
    timestamp(),
    prettyPrint()
  ),
  transports: [new winston.transports.Console()],
  defaultMeta: true
});

export default logger;
