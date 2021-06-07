import settings from '../config/settings';
import { loadFeeds } from '@umb-network/toolbox';

export default async function loadL2DKeys(): Promise<string[]> {
  const feeds = await loadFeeds(settings.feedsFile);
  return [...Object.keys(feeds)];
}
