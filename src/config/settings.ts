import dotenv from 'dotenv';
import Settings from '../types/Settings';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../../package.json');

dotenv.config();

const settings: Settings = {
  port: parseInt(process.env.PORT || '3000'),
  jobs: {
    blockCreation: {
      interval: parseInt(process.env.BLOCK_CREATION_JOB_INTERVAL || '1000', 10),
    },
    metricsReporting: {
      interval: parseInt(process.env.METRICS_REPORTING_JOB_INTERVAL || '60000', 10),
    },
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  },
  mongodb: {
    url: process.env.MONGODB_URL || 'mongodb://localhost:27017/sanctuary',
  },
  app: {
    blockSyncBatchSize: parseInt(process.env.BLOCK_SYNC_BATCH_SIZE || '5', 10),
    feedsFile:
      process.env.FEEDS_FILE || 'https://raw.githubusercontent.com/umbrella-network/pegasus-feeds/main/feeds.yaml',
    feedsOnChain:
      process.env.FEEDS_ON_CHAIN_FILE ||
      'https://raw.githubusercontent.com/umbrella-network/pegasus-feeds/main/feedsOnChain.yaml',
  },
  blockchain: {
    startBlockNumber: parseInt(process.env.START_BLOCK_NUMBER || '-100000', 10),
    scanBatchSize: parseInt(process.env.BLOCK_SCAN_BATCH_SIZE || '1000', 10),
    confirmations: parseInt(process.env.BLOCK_CONFIRMATIONS || '5', 10),
    provider: {
      url: process.env.BLOCKCHAIN_PROVIDER_URL || 'ws://127.0.0.1:8545',
    },
    contracts: {
      chain: {
        name: 'Chain',
      },
      registry: {
        address: process.env.REGISTRY_CONTRACT_ADDRESS,
      },
      validatorRegistry: {
        name: 'ValidatorRegistry',
      },
    },
  },
  auth: {
    tokenExpiry: 60 * 60 * 24 * 7, // 1 week
    walletVerificationThreshold: 10,
  },
  environment: process.env.ENVIRONMENT || process.env.NODE_ENV,
  version: packageJson.version,
  influxDB: {
    url: process.env.INFLUX_URL || 'http://localhost:8086',
    org: process.env.INFLUX_ORG || 'sanctuary',
    username: process.env.INFLUX_USERNAME || 'admin',
    password: process.env.INFLUX_PASSWORD || 'password',
    bucket: process.env.INFLUX_BUCKET || 'sanctuary',
    token: process.env.INFLUX_TOKEN || 'localDevToken',
  },
};

export default settings;
