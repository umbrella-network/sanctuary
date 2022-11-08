import { Factory } from 'rosie';
import { v4 } from 'uuid';

export const fcdFactory = Factory.define('FCD')
  .attr('_id', () => v4())
  .attr('key', 'UMB-USD')
  .attr('value', 1000)
  .attr('dataTimestamp', new Date(1))
  .attr('chainId', 'bsc');
