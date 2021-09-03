export type BlockchainSettings = {
  startBlockNumber: number;
  scanBatchSize: number;
  confirmations: number;
  providerUrl: string
  contractRegistryAddress: string;
  transactions?: {
    waitForBlockTime: number
    minGasPrice: number;
    maxGasPrice: number;
  },
}

type Settings = {
  port: number;
  jobs: {
    blockCreation: {
      interval: number;
    };
    metricsReporting: {
      interval: number;
    };
    foreignChainReplication: {
      ethereum: {
        interval: number;
        lockTTL: number;
      }
    };
  };
  redis: {
    url: string;
  };
  mongodb: {
    url: string;
  };
  app: {
    blockSyncBatchSize: number;
    feedsFile: string;
    feedsOnChain: string;
  };
  blockchain: {
    contracts: {
      chain: {
        name: string;
      };
      stakingBank: {
        name: string;
      };
    };
    replicatorPrivateKey: string;
    homeChain: {
      chainId: string;
      replicationConfirmations: number;
    }
    foreignChain: {
      bsc: BlockchainSettings;
      ethereum: BlockchainSettings;
    }
  };
  auth: {
    tokenExpiry: number;
    walletVerificationThreshold: number;
  };
  version: string;
  environment?: string;
  influxDB: {
    url: string;
    org: string;
    username: string;
    password: string;
    bucket: string;
    token: string;
  };
};

export default Settings;
