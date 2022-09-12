export type BlockchainSettings = {
  startBlockNumber: number;
  scanBatchSize: number;
  maxRequestConcurrency: number;
  confirmations: number;
  providerUrl: string;
  contractRegistryAddress: string;
  transactions?: {
    waitForBlockTime: number;
    minGasPrice: number;
    maxGasPrice: number;
    mintBalance?: {
      warningLimit: string;
      errorLimit: string;
    };
  };
};

export type SinglentonWorkerSchedulerSettings = {
  interval: number;
  lockTTL: number;
};

type Settings = {
  port: number;
  jobs: {
    blockCreation: {
      interval: number;
      lockTTL: number;
    };
    metricsReporting: {
      interval: number;
    };
    chainsWorkerSchedulerSettings: {
      bsc: SinglentonWorkerSchedulerSettings;
      ethereum: SinglentonWorkerSchedulerSettings;
      polygon: SinglentonWorkerSchedulerSettings;
      avax: SinglentonWorkerSchedulerSettings;
      arbitrum: SinglentonWorkerSchedulerSettings;
      solana: SinglentonWorkerSchedulerSettings;
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
    };
    multiChains: {
      bsc: BlockchainSettings;
      ethereum: BlockchainSettings;
      polygon: BlockchainSettings;
      avax: BlockchainSettings;
      arbitrum: BlockchainSettings;
      solana: BlockchainSettings;
    };
    solana: {
      replicatorSecretKey: string;
      chainProgramPublicKeyInitString: string;
      maxTransactionConfirmationRetries: number;
      transactionConfirmationRetryTimeout: number;
    };
  };
  auth: {
    jwt: {
      domain: string;
      audience: string;
    };
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
  auth0: {
    connectionId?: string;
    clientId?: string;
    clientSecret: string;
    domain: string;
  };
  repositoriesConfig: {
    leafRepository: {
      blockSearchInterval: number;
    };
  };
  api: {
    restrict: {
      apiKey: string;
    };
  };
  signatures: {
    minSearchRange: number;
    maxSearchRange: number;
    maxSearchRangeInSeconds: number;
  };
  name: string;
};

export default Settings;
