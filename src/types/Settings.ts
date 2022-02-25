export type BlockchainSettings = {
  startBlockNumber: number;
  scanBatchSize: number;
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

export type ForeignChainReplicationSettings = {
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
    foreignChainReplication: {
      ethereum: ForeignChainReplicationSettings;
      polygon: ForeignChainReplicationSettings;
      avax: ForeignChainReplicationSettings;
      arbitrum: ForeignChainReplicationSettings;
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
};

export default Settings;
