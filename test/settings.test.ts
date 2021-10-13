import { expect } from 'chai';
import { ForeignChainsIds } from '../src/types/ChainsIds';
import settings from '../src/config/settings';

describe('Settings', () => {
  ForeignChainsIds.forEach((foreignChainId) => {
    it(`has correct jobs settings for ${foreignChainId}`, () => {
      const { foreignChainReplication } = settings.jobs;
      expect(Object.keys(foreignChainReplication)).to.include(foreignChainId);
    });

    it(`has correct blockchain settings for ${foreignChainId}`, () => {
      const { multiChains } = settings.blockchain;
      expect(Object.keys(multiChains)).to.include(foreignChainId);
    });
  });
});
