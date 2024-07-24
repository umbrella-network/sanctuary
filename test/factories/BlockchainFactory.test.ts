import 'reflect-metadata';
import { expect } from 'chai';
import { BlockchainFactory } from '../../src/factories/BlockchainFactory';
import { ForeignChainsIds, NonEvmChainsIds } from '../../src/types/ChainsIds';
import settings from '../../src/config/settings';

describe('BlockchainFactory', () => {
  describe('#create', () => {
    describe('Given a foreign chainId for an evm blockchain (optional)', async () => {
      ForeignChainsIds.filter((x) => !NonEvmChainsIds.includes(x)).forEach((chainId) => {
        it('should return a Blockchain instance', async () => {
          try {
            const blockchain = BlockchainFactory.create({ chainId, settings });
            expect(!!blockchain).to.eql(true);
            expect(blockchain.chainId).to.eql(chainId);
          } catch (e) {
            if (e.message.includes('could not detect network')) console.error(e.message);
            else throw e;
          }
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
