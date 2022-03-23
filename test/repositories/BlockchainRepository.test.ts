import 'reflect-metadata';
import { expect } from 'chai';
import { BlockchainRepository } from '../../src/repositories/BlockchainRepository';
import { ForeignChainsIds, NonEvmChainsIds } from '../../src/types/ChainsIds';

import { getTestContainer } from '../helpers/getTestContainer';

describe('BlockchainRepository', () => {
  let blockchainRepository: BlockchainRepository;

  beforeEach(() => {
    const container = getTestContainer();
    container.bind(BlockchainRepository).toSelf();
    blockchainRepository = container.get(BlockchainRepository);
  });

  describe('#get', () => {
    describe('Given a foreign chainId for an evm blockchain', async () => {
      ForeignChainsIds.filter((x) => !NonEvmChainsIds.includes(x)).forEach((chainId) => {
        it('should return a Blockchain instance', async () => {
          const blockchain = blockchainRepository.get(chainId);
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
          const blockchain = blockchainRepository.getGeneric(chainId);
          expect(!!blockchain).to.eql(true);
          expect(blockchain.chainId).to.eql(chainId);
        });
      });
    });
  });
});
