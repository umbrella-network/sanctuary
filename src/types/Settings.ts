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
    startBlockNumber: number;
    scanBatchSize: number;
    confirmations: number;
    provider: {
      url: string;
      privateKey: string;
    };
    contracts: {
      chain: {
        name: string;
      };
      registry: {
        address: string;
      };
      stakingBank: {
        name: string;
      };
    };
    transactions: {
      waitForBlockTime: number
      minGasPrice: number;
      maxGasPrice: number;
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
