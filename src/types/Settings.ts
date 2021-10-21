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
    };
    metricsReporting: {
      interval: number;
    };
    foreignChainReplication: {
      ethereum: ForeignChainReplicationSettings;
      polygon: ForeignChainReplicationSettings;
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
  auth0: {
    audience: string;
    issuer: string;
    jwksUri: string;
  };
};

export default Settings;
