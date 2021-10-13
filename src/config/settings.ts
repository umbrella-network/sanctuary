import Settings from '../types/Settings';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../../package.json');

const settings: Settings = {
  port: parseInt(process.env.PORT || '3000'),
  jobs: {
    blockCreation: {
      interval: parseInt(process.env.BLOCK_CREATION_JOB_INTERVAL || '1000', 10),
    },
    metricsReporting: {
      interval: parseInt(process.env.METRICS_REPORTING_JOB_INTERVAL || '60000', 10),
    },
    foreignChainReplication: {
      ethereum: {
        interval: parseInt(process.env.ETH_REPLICATION_INTERVAL || '60000'),
        lockTTL: parseInt(process.env.ETH_REPLICATION_LOCK_TTL || '30000'),
      },
      polygon: {
        interval: parseInt(process.env.POLYGON_REPLICATION_INTERVAL || '10000'),
        lockTTL: parseInt(process.env.POLYGON_REPLICATION_LOCK_TTL || '5000'),
      },
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
    contracts: {
      chain: {
        name: 'Chain',
      },
      stakingBank: {
        name: 'StakingBank',
      },
    },
    replicatorPrivateKey: process.env.REPLICATOR_PRIVATE_KEY as string,
    homeChain: {
      chainId: 'bsc',
      replicationConfirmations: parseInt(process.env.HOME_REPLICATION_CONFIRMATIONS || '20', 10),
    },
    multiChains: {
      bsc: {
        startBlockNumber: parseInt(process.env.START_BLOCK_NUMBER || '-100000', 10),
        scanBatchSize: parseInt(process.env.BLOCK_SCAN_BATCH_SIZE || '5000', 10), // for BSC 5K is max
        confirmations: parseInt(process.env.BLOCK_CONFIRMATIONS || '5', 10),
        providerUrl: process.env.BLOCKCHAIN_PROVIDER_URL, // we can't have default providers set up
        contractRegistryAddress: process.env.REGISTRY_CONTRACT_ADDRESS,
      },
      ethereum: {
        startBlockNumber: parseInt(process.env.ETH_START_BLOCK_NUMBER || '-100000', 10),
        scanBatchSize: parseInt(process.env.ETH_BLOCK_SCAN_BATCH_SIZE || '10000', 10),
        confirmations: parseInt(process.env.ETH_BLOCK_CONFIRMATIONS || '5', 10),
        providerUrl: process.env.ETH_BLOCKCHAIN_PROVIDER_URL, // we can't have default providers set up
        contractRegistryAddress: process.env.ETH_REGISTRY_CONTRACT_ADDRESS,
        transactions: {
          waitForBlockTime: parseInt(process.env.ETH_WAIT_FOR_BLOCK_TIME || '1000'),
          minGasPrice: parseInt(process.env.ETH_MIN_GAS_PRICE || '2000000000', 10),
          maxGasPrice: parseInt(process.env.ETH_MAX_GAS_PRICE || '500000000000', 10),
        },
      },
      polygon: {
        startBlockNumber: parseInt(process.env.POLYGON_START_BLOCK_NUMBER || '-100000', 10),
        scanBatchSize: parseInt(process.env.POLYGON_BLOCK_SCAN_BATCH_SIZE || '10000', 10),
        confirmations: parseInt(process.env.POLYGON_BLOCK_CONFIRMATIONS || '5', 10),
        providerUrl: process.env.POLYGON_BLOCKCHAIN_PROVIDER_URL, // we can't have default providers set up
        contractRegistryAddress: process.env.POLYGON_REGISTRY_CONTRACT_ADDRESS,
        transactions: {
          waitForBlockTime: parseInt(process.env.POLYGON_WAIT_FOR_BLOCK_TIME || '1000'),
          minGasPrice: parseInt(process.env.POLYGON_MIN_GAS_PRICE || '1000000000', 10),
          maxGasPrice: parseInt(process.env.POLYGON_MAX_GAS_PRICE || '500000000000', 10),
        },
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
