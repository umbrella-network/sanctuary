type Settings = {
  port: number;
  jobs: {
    blockCreation: {
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
};

export default Settings;
