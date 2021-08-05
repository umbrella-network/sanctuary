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
    startBlockNumber: number;
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
      stakingBank: {
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
};

export default Settings;
