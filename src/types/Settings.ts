type Settings = {
  port: number,
  jobs: {
    blockCreation: {
      interval: number
    }
  },
  redis: {
    url: string
  },
  mongodb: {
    url: string
  },
  blockchain: {
    provider: {
      url: string,
      privateKey: string
    },
    contracts: {
      chain: {
        address: string
      },
      validatorRegistry: {
        address: string
      }
    }
  }
}

export default Settings;
