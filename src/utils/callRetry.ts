import axios, { AxiosResponse } from 'axios';
import { sleep } from './sleep';

export const callRetry = async (url: string, retries = 3, delayMs = 500): Promise<AxiosResponse> => {
  const attempts = new Array(retries).fill(1);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const _ of attempts) {
    try {
      // axios don't have retries, so this is custom
      return await axios.get(url);
    } catch (e) {
      if (e.message.includes('ETIMEDOUT')) {
        await sleep(delayMs);
        continue;
      }

      throw e;
    }
  }
};
