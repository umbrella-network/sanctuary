import { Container } from 'inversify';
import logger from '../../src/lib/logger';

export function getTestContainer(): Container {
  const container = new Container({ autoBindInjectable: true });
  container.bind('Logger').toConstantValue(logger);
  return container;
}
