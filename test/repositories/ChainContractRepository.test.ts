import 'reflect-metadata';
import { expect } from 'chai';
import { ChainContractRepository } from '../../src/repositories/ChainContractRepository';
import { BlockchainRepository } from '../../src/repositories/BlockchainRepository';
import { ForeignChainsIds, NonEvmChainsIds } from '../../src/types/ChainsIds';

import { getTestContainer } from '../helpers/getTestContainer';

describe('ChainContractRepository', () => {
  let chainContractRepository: ChainContractRepository;

  beforeEach(() => {
    const container = getTestContainer();
    container.bind(ChainContractRepository).toSelf();
    container.bind(BlockchainRepository).toSelf();
    chainContractRepository = container.get(ChainContractRepository);
  });

  describe('#get', () => {
    describe('Given a foreign chainId for an evm blockchain', async () => {
      ForeignChainsIds.filter((x) => !NonEvmChainsIds.includes(x)).forEach((chainId) => {
        it(`should return a ForeignChainContract instance for ${chainId}`, async () => {
          const foreignChainContract = chainContractRepository.get(chainId);
          await foreignChainContract.resolveContract();
          expect(!!foreignChainContract).to.eql(true);

          const address = foreignChainContract.address();
          expect(typeof address).to.eql('string');
        });
      });
    });
  });

  describe('#getGeneric', () => {
    describe('Given a foreign chainId for a non-evm blockchain', async () => {
      NonEvmChainsIds.forEach((chainId) => {
        it(`should return an IGenericForeignChainContract instance for ${chainId}`, async () => {
          const foreignChainContract = chainContractRepository.getGeneric(chainId);
          await foreignChainContract.resolveContract();
          const address = foreignChainContract.address();
          expect(!!foreignChainContract).to.eql(true);
          expect(foreignChainContract.blockchain.chainId).to.eql(chainId);
          expect(!!address).to.eql(true);
          expect(typeof address).to.eql('string');
        });
      });
    });
  });
});
