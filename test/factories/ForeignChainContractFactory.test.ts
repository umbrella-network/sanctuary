import 'reflect-metadata';
import { expect } from 'chai';
import { BlockchainFactory } from '../../src/factories/BlockchainFactory';
import { ForeignChainContractFactory } from '../../src/factories/ForeignChainContractFactory';
import { BaseChainContractProps } from '../../src/contracts/BaseChainContract';
import { ForeignChainContract } from '../../src/contracts/ForeignChainContract';
import {
  GenericForeignChainContractProps,
  IGenericForeignChainContract,
} from '../../src/contracts/generic/IGenericForeignChainContract';
import { ChainsIds, ForeignChainsIds, NonEvmChainsIds } from '../../src/types/ChainsIds';
import settings from '../../src/config/settings';

describe('ForeignChainContractFactory', () => {
  describe('#create', () => {
    describe('Given a foreign chainId for an evm blockchain', async () => {
      ForeignChainsIds.filter((x) => !NonEvmChainsIds.includes(x))
        .filter((x) => x !== ChainsIds.ARBITRUM) // TODO enable when we move to goerli
        .forEach((chainId) => {
          it(`should return a ForeignChainContract instance for ${chainId}`, async () => {
            const blockchain = BlockchainFactory.create({ chainId, settings });
            expect(blockchain).to.not.be.undefined;
            expect(blockchain.chainId).to.eql(chainId);

            const foreignChainContract = ForeignChainContractFactory.create(<BaseChainContractProps>{
              blockchain: blockchain,
              settings,
            });

            expect(foreignChainContract).to.not.be.empty;

            await foreignChainContract.resolveContract();
            expect((<ForeignChainContract>foreignChainContract).address()).to.not.empty;

            const address = foreignChainContract.address();
            expect(typeof address).to.eql('string');
          });
        });
    });

    describe('Given a foreign chainId for a non-evm blockchain', async () => {
      NonEvmChainsIds.forEach((chainId) => {
        it(`should return an GenericForeignChainContract instance for ${chainId}`, async () => {
          const blockchain = BlockchainFactory.create({ chainId, settings });
          expect(!!blockchain).to.eql(true);
          expect(blockchain.chainId).to.eql(chainId);

          const genericForeignChainContract = ForeignChainContractFactory.create(<GenericForeignChainContractProps>{
            blockchain: blockchain,
            settings,
          });

          await genericForeignChainContract.resolveContract();
          const address = genericForeignChainContract.address();
          expect(!!genericForeignChainContract).to.eql(true);
          expect((<IGenericForeignChainContract>genericForeignChainContract).blockchain.chainId).to.eql(chainId);
          expect(!!address).to.eql(true);
          expect(typeof address).to.eql('string');
        });
      });
    });
  });
});
