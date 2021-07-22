type Settings = {
  port: number;
  jobs: {
    blockCreation: {
      interval: number;
    };
    metricsReporting: {
      interval: number;
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
    scanBatchSize: number;
    confirmations: number;
    provider: {
      url: string;
    };
    contracts: {
      chain: {
        name: string;
      };
      registry: {
        address: string;
      };
      validatorRegistry: {
        name: string;
      };
    };
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
