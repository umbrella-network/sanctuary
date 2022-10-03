import { expect } from 'chai';
import { ForeignChainsIds } from '../src/types/ChainsIds';
import settings from '../src/config/settings';

describe('Settings', () => {
  ForeignChainsIds.forEach((foreignChainId) => {
    it(`has correct jobs settings for ${foreignChainId}`, () => {
      const { chainsWorkerSchedulerSettings } = settings.jobs;
      expect(Object.keys(chainsWorkerSchedulerSettings)).to.include(foreignChainId);
    });

    it(`has correct blockchain settings for ${foreignChainId}`, () => {
      const { multiChains } = settings.blockchain;
      expect(Object.keys(multiChains)).to.include(foreignChainId);
    });
  });
});
