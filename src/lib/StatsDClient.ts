/* eslint-disable */
const SDC = require('statsd-client');
const newRelicLabels = process.env.NEW_RELIC_LABELS;

let tags: { [key: string]: any } = {};
tags = newRelicLabels.split(';').reduce((nrTags, tag) => {
  var t = tag.split(':');
  nrTags[t[0]] = t[1];
  return nrTags;
}, tags);

const StatsDClient = process.env.STATSD_URL
  ? new SDC({
      host: process.env.STATSD_URL,
      tags: tags,
    })
  : null;

export default StatsDClient;
