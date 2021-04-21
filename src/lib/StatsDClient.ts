/* eslint-disable */
const SDC = require('statsd-client');
const StatsDClient = process.env.STATSD_URL
  ? new SDC({
      host: process.env.STATSD_URL
    })
  : null;

export default StatsDClient;
