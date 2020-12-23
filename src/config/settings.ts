import Settings from '../types/Settings';

const settings: Settings = {
  port: parseInt(process.env.PORT || '3000'),
  jobs: {
    blockCreation: {
      interval: parseInt(process.env.BLOCK_CREATION_JOB_INTERVAL || '1000'),
    },
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  },
  mongodb: {
    url: process.env.MONGODB_URL || 'mongodb://localhost:27017/sanctuary',
  },
  blockchain: {
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
};

export default settings;
