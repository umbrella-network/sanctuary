import 'reflect-metadata';
import { expect } from 'chai';
import { BlockchainFactory } from '../../src/factories/BlockchainFactory';
import { ForeignChainContractFactory } from '../../src/factories/ForeignChainContractFactory';
import { BaseChainContractProps } from '../../src/contracts/BaseChainContract';
import { SolanaForeignChainContract } from '../../src/contracts/generic/SolanaForeignChainContract';
import { ChainsIds } from '../../src/types/ChainsIds';
import settings from '../../src/config/settings';

describe('SolanaForeignChainContract', () => {
  let solanaForeignChainContract: SolanaForeignChainContract;

  before(async () => {
    const blockchain = BlockchainFactory.create({ chainId: ChainsIds.SOLANA, settings });
    expect(!!blockchain).to.eql(true);
    expect(blockchain.chainId).to.eql(ChainsIds.SOLANA);

    solanaForeignChainContract = <SolanaForeignChainContract>ForeignChainContractFactory.create(<
      BaseChainContractProps
    >{
      blockchain: blockchain,
      settings,
    });

    await solanaForeignChainContract.resolveContract();
    const address = solanaForeignChainContract.address;
    expect(!!solanaForeignChainContract).to.eql(true);
    expect(solanaForeignChainContract.blockchain.chainId).to.eql(ChainsIds.SOLANA);
    expect(!!address).to.eql(true);
    expect(typeof address).to.eql('string');
  });

  describe('#resolveStatus', () => {
    it('should resolve status for the foreign chain contract', async () => {
      const status = await solanaForeignChainContract.resolveStatus();
      expect(!!status).to.eql(true);
      expect(!!status.chainAddress).to.eql(true);
      expect(!!status.blockNumber).to.eql(true);
      expect(!!status.timePadding).to.eql(true);
      expect(!!status.lastDataTimestamp).to.eql(true);
      expect(!!status.lastId).to.eql(true);
      expect(!!status.nextBlockId).to.eql(true);
    });
  });

  describe('#blocksCountOffset', () => {
    it('should return the blocksCountOffset for the foreign chain contract', async () => {
      expect(await solanaForeignChainContract.blocksCountOffset()).to.eql(0);
    });
  });

  describe('#resolveBlockData', () => {
    it('should resolve block data for the given blockId', async () => {
      const blockData = await solanaForeignChainContract.resolveBlockData(solanaForeignChainContract.address, 376168);

      expect(!!blockData).to.eql(true);
      expect(blockData.root).to.eql('0x57e6c34cb6627f00a9a0b10c489b3cb7cbb87c12214c87eeb7660d4e6251d432');
      expect(blockData.dataTimestamp).to.eql(1649529906);
    });
  });

  describe('#resolveFCDs', () => {
    it('should resolve FCDs for the given keys', async () => {
      const fdcsData = await solanaForeignChainContract.resolveFCDs(solanaForeignChainContract.address, []);

      expect(fdcsData.length).to.eql(2);
      expect(fdcsData[0].length).to.eql(0);
      expect(fdcsData[1].length).to.eql(0);
    });
  });

  describe('#resolveBlocksCountOffset', () => {
    it('should return the blocksCountOffset after resolving the chain contract', async () => {
      const blocksCountOffset = await solanaForeignChainContract.resolveBlocksCountOffset(
        solanaForeignChainContract.address
      );

      expect(blocksCountOffset).to.eql(0);
    });
  });

  describe('#getBlockPda', () => {
    it('should return the Program Derived Address (pda) for the given block and chainAddress', async () => {
      const blockPda = await solanaForeignChainContract.getBlockPda(solanaForeignChainContract.address, 471398);

      expect(!!blockPda).to.eql(true);
      expect(!!blockPda.toBase58()).to.eql(true);
      expect(typeof blockPda.toBase58()).to.eql('string');
    });
  });

  describe('#isFCDInitialized', async () => {
    const initializedKeys = [
      'AAVE-USD',
      'BNB-USD',
      'BNT-USD',
      'BTC-USD',
      'COMP-USD',
      'DAI-USD',
      'ETH-USD',
      'FTS-USD',
      'GVol-BTC-IV-28days',
      'GVol-ETH-IV-28days',
      'LINK-USD',
      'MAHA-USD',
      'REN-USD',
      'SNX-USD',
      'UMB-USD',
      'UNI-USD',
      'YFI-USD',
    ];

    initializedKeys.forEach((key) => {
      it(`should return true for an initialized FCD ${key}`, async () => {
        expect(await solanaForeignChainContract.isFCDInitialized(key)).to.eql(true);
      });
    });

    const uninitializedKeys = ['AAVE-FAKE', 'BNB-FAKE', 'BNT-FAKE', 'BTC-FAKE', 'COMP-FAKE'];

    uninitializedKeys.forEach((key) => {
      it(`should return false for an un-initialized FCD ${key}`, async () => {
        expect(await solanaForeignChainContract.isFCDInitialized(key)).to.eql(false);
      });
    });
  });
});
