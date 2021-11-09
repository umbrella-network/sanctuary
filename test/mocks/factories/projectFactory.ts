import { Factory } from 'rosie';
import { v4 } from 'uuid';

export const projectFactory = Factory.define('Project')
  .attr('_id', () => v4())
  .sequence('name', (n) => `Project ${n}`);
