import SDC from 'statsd-client';
import StatsdClient from 'statsd-client';

export function getStatsdClient(): StatsdClient {
  const { NEW_RELIC_LABELS = '' } = process.env;
  let tags: { [key: string]: string } = {};

  tags = NEW_RELIC_LABELS.split(';').reduce((nrTags, tag) => {
    const t = tag.split(':');
    nrTags[t[0]] = t[1];
    return nrTags;
  }, tags);

  const statsDClient = process.env.STATSD_URL
    ? new SDC({
        host: process.env.STATSD_URL,
        tags: tags,
      })
    : null;

  return statsDClient;
}
