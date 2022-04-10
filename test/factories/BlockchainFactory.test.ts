import 'reflect-metadata';
import { expect } from 'chai';
import { BlockchainFactory } from '../../src/factories/BlockchainFactory';
import { ForeignChainsIds, NonEvmChainsIds } from '../../src/types/ChainsIds';
import settings from '../../src/config/settings';

describe('BlockchainFactory', () => {
  describe('#create', () => {
    describe('Given a foreign chainId for an evm blockchain', async () => {
      ForeignChainsIds.filter((x) => !NonEvmChainsIds.includes(x)).forEach((chainId) => {
        it('should return a Blockchain instance', async () => {
          const blockchain = BlockchainFactory.create({ chainId, settings });
          expect(!!blockchain).to.eql(true);
          expect(blockchain.chainId).to.eql(chainId);
        });
      });
    });
  });

  describe('#getGeneric', () => {
    describe('Given a foreign chainId for a non-evm blockchain', async () => {
      NonEvmChainsIds.forEach((chainId) => {
        it('should return an IGenericBlockchain instance', async () => {
          const blockchain = BlockchainFactory.create({ chainId, settings });
          expect(!!blockchain).to.eql(true);
          expect(blockchain.chainId).to.eql(chainId);
        });
      });
    });
  });
});
