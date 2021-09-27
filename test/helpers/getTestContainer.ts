import { Container } from 'inversify';
import { createLogger, transports } from 'winston';

export function getTestContainer(): Container {
  const container = new Container({ autoBindInjectable: true });

  const logger = createLogger({
    level: 'INFO',
    transports: [
      new transports.Console({ silent: true })
    ]
  });

  container.bind('Logger').toConstantValue(logger);
  return container;
}
