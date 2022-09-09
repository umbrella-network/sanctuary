import Settings from '../types/Settings';
import './setupDotenv';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../../package.json');

const settings: Settings = {
  port: parseInt(process.env.PORT || '3000'),
  jobs: {
    blockCreation: {
      interval: parseInt(process.env.BLOCK_CREATION_JOB_INTERVAL || '1000', 10),
      lockTTL: parseInt(process.env.BLOCK_CREATION_LOCK_TTL || '20000'),
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
      avax: {
        interval: parseInt(process.env.AVALANCHE_REPLICATION_INTERVAL || '10000'),
        lockTTL: parseInt(process.env.AVALANCHE_REPLICATION_LOCK_TTL || '5000'),
      },
      arbitrum: {
        interval: parseInt(process.env.ARBITRUM_REPLICATION_INTERVAL || '10000'),
        lockTTL: parseInt(process.env.ARBITRUM_REPLICATION_LOCK_TTL || '5000'),
      },
      solana: {
        interval: parseInt(process.env.SOLANA_REPLICATION_INTERVAL || '10000'),
        lockTTL: parseInt(process.env.SOLANA_REPLICATION_LOCK_TTL || '5000'),
      },
    },
    chainResolver: {
      bsc: {
        interval: parseInt(process.env.ETH_RESOLVER_INTERVAL || '60000'),
        lockTTL: parseInt(process.env.ETH_RESOLVER_LOCK_TTL || '30000'),
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
        maxRequestConcurrency: parseInt(process.env.MAX_REQUEST_CONCURRENCY || '10', 10),
        confirmations: parseInt(process.env.BLOCK_CONFIRMATIONS || '5', 10),
        providerUrl: process.env.BLOCKCHAIN_PROVIDER_URL, // we can't have default providers set up
        contractRegistryAddress: process.env.REGISTRY_CONTRACT_ADDRESS,
      },
      ethereum: {
        startBlockNumber: parseInt(process.env.ETH_START_BLOCK_NUMBER || '-100000', 10),
        scanBatchSize: parseInt(process.env.ETH_BLOCK_SCAN_BATCH_SIZE || '10000', 10),
        maxRequestConcurrency: parseInt(process.env.ETH_MAX_REQUEST_CONCURRENCY || '10', 10),
        confirmations: parseInt(process.env.ETH_BLOCK_CONFIRMATIONS || '5', 10),
        providerUrl: process.env.ETH_BLOCKCHAIN_PROVIDER_URL, // we can't have default providers set up
        contractRegistryAddress: process.env.ETH_REGISTRY_CONTRACT_ADDRESS,
        transactions: {
          waitForBlockTime: parseInt(process.env.ETH_WAIT_FOR_BLOCK_TIME || '1000'),
          minGasPrice: parseInt(process.env.ETH_MIN_GAS_PRICE || '2000000000', 10),
          maxGasPrice: parseInt(process.env.ETH_MAX_GAS_PRICE || '500000000000', 10),
          mintBalance: {
            warningLimit: process.env.ETH_BALANCE_WARN || '0.6',
            errorLimit: process.env.ETH_BALANCE_ERROR || '0.06',
          },
        },
      },
      polygon: {
        startBlockNumber: parseInt(process.env.POLYGON_START_BLOCK_NUMBER || '-100000', 10),
        scanBatchSize: Math.max(3500, parseInt(process.env.POLYGON_BLOCK_SCAN_BATCH_SIZE || '3500', 10)),
        maxRequestConcurrency: parseInt(process.env.POLYGON_MAX_REQUEST_CONCURRENCY || '10', 10),
        confirmations: parseInt(process.env.POLYGON_BLOCK_CONFIRMATIONS || '5', 10),
        providerUrl: process.env.POLYGON_BLOCKCHAIN_PROVIDER_URL, // we can't have default providers set up
        contractRegistryAddress: process.env.POLYGON_REGISTRY_CONTRACT_ADDRESS,
        transactions: {
          waitForBlockTime: parseInt(process.env.POLYGON_WAIT_FOR_BLOCK_TIME || '1000'),
          minGasPrice: parseInt(process.env.POLYGON_MIN_GAS_PRICE || '1000000000', 10),
          maxGasPrice: parseInt(process.env.POLYGON_MAX_GAS_PRICE || '500000000000', 10),
          mintBalance: {
            warningLimit: process.env.POLYGON_BALANCE_WARN || '0.5',
            errorLimit: process.env.POLYGON_BALANCE_ERROR || '0.02',
          },
        },
      },
      avax: {
        startBlockNumber: parseInt(process.env.AVALANCHE_START_BLOCK_NUMBER || '-100000', 10),
        scanBatchSize: Math.max(2000, parseInt(process.env.AVALANCHE_BLOCK_SCAN_BATCH_SIZE || '2000', 10)),
        maxRequestConcurrency: parseInt(process.env.AVALANCHE_MAX_REQUEST_CONCURRENCY || '10', 10),
        confirmations: parseInt(process.env.AVALANCHE_BLOCK_CONFIRMATIONS || '5', 10),
        providerUrl: process.env.AVALANCHE_BLOCKCHAIN_PROVIDER_URL, // we can't have default providers set up
        contractRegistryAddress: process.env.AVALANCHE_REGISTRY_CONTRACT_ADDRESS,
        transactions: {
          waitForBlockTime: parseInt(process.env.AVALANCHE_WAIT_FOR_BLOCK_TIME || '1000'),
          minGasPrice: parseInt(process.env.AVALANCHE_MIN_GAS_PRICE || '25000000000', 10),
          maxGasPrice: parseInt(process.env.AVALANCHE_MAX_GAS_PRICE || '250000000000', 10),
          mintBalance: {
            warningLimit: process.env.AVALANCHE_BALANCE_WARN || '0.15',
            errorLimit: process.env.AVALANCHE_BALANCE_ERROR || '0.015',
          },
        },
      },
      arbitrum: {
        startBlockNumber: parseInt(process.env.ARBITRUM_START_BLOCK_NUMBER || '-100000', 10),
        scanBatchSize: parseInt(process.env.ARBITRUM_BLOCK_SCAN_BATCH_SIZE || '10000', 10),
        maxRequestConcurrency: parseInt(process.env.ARBITRUM_MAX_REQUEST_CONCURRENCY || '10', 10),
        confirmations: parseInt(process.env.ARBITRUM_BLOCK_CONFIRMATIONS || '5', 10),
        providerUrl: process.env.ARBITRUM_BLOCKCHAIN_PROVIDER_URL, // we can't have default providers set up
        contractRegistryAddress: process.env.ARBITRUM_REGISTRY_CONTRACT_ADDRESS,
        transactions: {
          waitForBlockTime: parseInt(process.env.ARBITRUM_WAIT_FOR_BLOCK_TIME || '1000'),
          minGasPrice: parseInt(process.env.ARBITRUM_MIN_GAS_PRICE || '500000000', 10),
          maxGasPrice: parseInt(process.env.ARBITRUM_MAX_GAS_PRICE || '250000000000', 10),
          mintBalance: {
            warningLimit: process.env.ARBITRUM_BALANCE_WARN || '0.05',
            errorLimit: process.env.ARBITRUM_BALANCE_ERROR || '0.01',
          },
        },
      },
      solana: {
        startBlockNumber: parseInt(process.env.SOLANA_START_BLOCK_NUMBER || '-100000', 10),
        scanBatchSize: parseInt(process.env.SOLANA_BLOCK_SCAN_BATCH_SIZE || '10000', 10),
        maxRequestConcurrency: parseInt(process.env.SOLANA_MAX_REQUEST_CONCURRENCY || '10', 10),
        confirmations: parseInt(process.env.SOLANA_BLOCK_CONFIRMATIONS || '5', 10),
        providerUrl: process.env.SOLANA_BLOCKCHAIN_PROVIDER_URL,
        contractRegistryAddress: null,
        transactions: {
          waitForBlockTime: parseInt(process.env.SOLANA_WAIT_FOR_BLOCK_TIME || '1000'),
          minGasPrice: null,
          maxGasPrice: null,
          mintBalance: {
            warningLimit: process.env.SOLANA_BALANCE_WARN || '0.1',
            errorLimit: process.env.SOLANA_BALANCE_ERROR || '0.005',
          },
        },
      },
    },
    solana: {
      replicatorSecretKey: process.env.SOLANA_REPLICATOR_SECRET_KEY,
      chainProgramPublicKeyInitString: process.env.SOLANA_CHAIN_PROGRAM_ID,
      maxTransactionConfirmationRetries: parseInt(process.env.SOLANA_MAX_TRANSACTION_CONFIRMATION_RETRIES || '1'),
      transactionConfirmationRetryTimeout: parseInt(process.env.SOLANA_MAX_TRANSACTION_CONFIRMATION_RETRIES || '10000'),
    },
  },
  auth: {
    jwt: {
      audience: process.env.AUTH_JWT_AUDIENCE || 'TEST_AUDIENCE',
      domain: process.env.AUTH_JWT_DOMAIN || 'example.com',
    },
  },
  auth0: {
    connectionId: process.env.AUTH0_CONNECTION_ID,
    clientId: process.env.AUTH0_CLIENT_ID || 'AUTH0_CLIENT',
    clientSecret: process.env.AUTH0_CLIENT_SECRET || 'AUTH0_SECRET',
    domain: process.env.AUTH0_DOMAIN || 'test.auth0.com',
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
  repositoriesConfig: {
    leafRepository: {
      blockSearchInterval: parseInt(process.env.BLOCK_SEARCH_INTERVAL || '6', 10),
    },
  },
  api: {
    restrict: {
      apiKey: process.env.RESTRICT_API_KEY as string,
    },
  },
  signatures: {
    minSearchRange: 1,
    maxSearchRange: parseInt(process.env.MAX_SIGNATURE_SEARCH_RANGE || '8', 10),
    maxSearchRangeInSeconds: parseInt(process.env.MAX_SIGNATURE_SEARCH_RANGE || '8', 10) * 24 * 60 * 60,
  },
  name: process.env.NEW_RELIC_APP_NAME || process.env.NAME || 'default',
};

export default settings;
