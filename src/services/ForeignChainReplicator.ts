import { inject, injectable } from 'inversify';
import { Logger } from 'winston';

import { BlockChainDataFactory } from '../factories/BlockChainDataFactory';
import { IForeignBlockReplicator, SolanaBlockReplicator } from './foreign-chain';

import { ReplicationStatus } from './foreign-chain/ForeignBlockReplicator';
import { IBlockChainData } from '../models/BlockChainData';
import { IFCD } from '../models/FCD';
import { FCDRepository } from '../repositories/FCDRepository';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import Settings from '../types/Settings';
import { TForeignChainsIds, NonEvmChainsIds } from '../types/ChainsIds';
import { parseEther } from 'ethers/lib/utils';
import { BigNumber } from 'ethers';
import { IGenericBlockchain } from '../lib/blockchains/IGenericBlockchain';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { sleep } from '../utils/sleep';
import { DispatcherDetector } from './DispatcherDetector';

export type ForeignChainReplicatorProps = {
  foreignChainId: TForeignChainsIds;
};

@injectable()
export class ForeignChainReplicator {
  private readonly replicators: { [key: string]: IForeignBlockReplicator };
  @inject('Logger') logger!: Logger;
  @inject(BlockChainDataFactory) blockChainDataFactory!: BlockChainDataFactory;
  @inject(FCDRepository) fcdRepository!: FCDRepository;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;
  @inject('Settings') private readonly settings: Settings;
  @inject(ChainContractRepository) chainContractRepository: ChainContractRepository;
  @inject(DispatcherDetector) dispatcherDetector: DispatcherDetector;

  constructor(@inject(SolanaBlockReplicator) solanaBlockReplicator: SolanaBlockReplicator) {
    this.replicators = {
      solana: solanaBlockReplicator,
    };
  }

  async apply(props: ForeignChainReplicatorProps): Promise<IBlockChainData[] | undefined> {
    const { foreignChainId } = props;
    this.logger.info(`[${foreignChainId}] Foreign Chain Block Replication initiated`);

    try {
      const { foreignChainId } = props;

      if (await this.dispatcherDetector.apply(foreignChainId)) {
        this.logger.info(`[${foreignChainId}] new chain architecture detected`);
        await sleep(60_000); // slow down execution
        return;
      }

      await this.checkBalanceIsEnough(foreignChainId);

      const replicator = this.replicators[foreignChainId];
      const foreignChainStatus = await replicator.getStatus();
      const blocks = await replicator.resolvePendingBlocks(foreignChainStatus, new Date());
      const replicationStatus = await replicator.replicate(blocks, foreignChainStatus);
      return await this.commit(replicationStatus, foreignChainId, foreignChainStatus.chainAddress);
    } catch (e) {
      e.message = `[${foreignChainId}] ${e.message}`;
      this.noticeError(e);
      return;
    }
  }

  private commit = async (
    replicationStatus: ReplicationStatus,
    chainId: string,
    chainAddress: string
  ): Promise<IBlockChainData[] | undefined> => {
    if (!replicationStatus.blocks || replicationStatus.blocks.length == 0) return;

    if (replicationStatus.errors) {
      this.noticeError(`Block Replication Error - Errors: ${JSON.stringify(replicationStatus)}`);
      return;
    }

    if (replicationStatus.blocks.length > 1) {
      this.noticeError('multiple block replication not supported');
      return;
    }

    const foreignBlocks: IBlockChainData[] = [];

    for (let i = 0; i < replicationStatus.blocks.length; i++) {
      const block = replicationStatus.blocks[i];
      const anchor = replicationStatus.anchors[i];
      const fcds = replicationStatus.fcds[i];
      const foreignBlock = this.blockChainDataFactory.fromBlock({ block, anchor, chainAddress, chainId });
      const saveData: Promise<IBlockChainData | IFCD>[] = [foreignBlock.save()];

      fcds.keys.forEach((key, k) => {
        saveData.push(
          this.fcdRepository.saveOrUpdate({
            key,
            value: replicationStatus.fcds[i].values[k],
            dataTimestamp: block.dataTimestamp,
            chainId,
          })
        );
      });

      try {
        await Promise.all(saveData);
        foreignBlocks.push(foreignBlock);
      } catch (e) {
        this.noticeError(e);
      }
    }

    return foreignBlocks;
  };

  private checkBalanceIsEnough = async (chainId: TForeignChainsIds): Promise<void> => {
    const blockchain = NonEvmChainsIds.includes(chainId)
      ? this.blockchainRepository.getGeneric(chainId)
      : this.blockchainRepository.get(chainId);

    const balance = await blockchain.wallet.getBalance();
    const toCurrency = NonEvmChainsIds.includes(chainId) ? (<IGenericBlockchain>blockchain).toBaseCurrency : parseEther;

    this.testBalanceThreshold(chainId, balance, toCurrency, blockchain.wallet.address);
  };

  private testBalanceThreshold = (
    chainId: TForeignChainsIds,
    balance: BigNumber,
    toCurrency: (amount: string) => BigNumber,
    address: string
  ) => {
    const { errorLimit, warningLimit } = this.settings.blockchain.multiChains[chainId].transactions.mintBalance;

    if (!balance || balance.lt(toCurrency(errorLimit))) {
      throw new Error(`[${chainId}] Balance (${address.slice(0, 10)}) is lower than ${errorLimit}`);
    }

    if (balance.lt(toCurrency(warningLimit))) {
      this.logger.warn(`[${chainId}] Balance (${address.slice(0, 10)}) is lower than ${warningLimit}`);
    }
  };

  private noticeError = (err: string): void => {
    this.logger.error(err);
  };
}
