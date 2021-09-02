import { Container } from 'inversify';
import winston, { Logger } from 'winston';

export function getTestContainer(): Container {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.simple(),
    transports: [new winston.transports.Console()],
  });

  const container = new Container({ autoBindInjectable: true });
  container.bind('Logger').toConstantValue(logger);
  
  return container;
}
