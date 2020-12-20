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
      url: string
    },
    contracts: {
      chain: {
        name: string
      },
      registry: {
        address: string
      }
      validatorRegistry: {
        name: string
      }
    }
  }
}

export default Settings;
