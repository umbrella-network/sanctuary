import { Factory } from 'rosie';
import { v4 } from 'uuid';

export const apiKeyFactory = Factory.define('ApiKey')
  .attr('_id', () => v4())
  .attr('key', () => v4());
