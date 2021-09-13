import IORedis from 'ioredis';
import Settings from '../types/Settings';

export default function (settings: Settings['redis']): IORedis.Redis {
  return new IORedis(settings.url);
}
