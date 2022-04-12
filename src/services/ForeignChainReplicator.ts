import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import { ForeignBlockFactory } from '../factories/ForeignBlockFactory';
import {
  ArbitrumBlockReplicator,
  AvalancheBlockReplicator,
  EthereumBlockReplicator,
  IForeignBlockReplicator,
  PolygonBlockReplicator,
  SolanaBlockReplicator,
} from './foreign-chain';
import { ReplicationStatus } from './foreign-chain/ForeignBlockReplicator';
import { IForeignBlock } from '../models/ForeignBlock';
import { IFCD } from '../models/FCD';
import { FCDRepository } from '../repositories/FCDRepository';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import Settings from '../types/Settings';
import { TForeignChainsIds, NonEvmChainsIds } from '../types/ChainsIds';
import { parseEther } from 'ethers/lib/utils';
import { BigNumber } from 'ethers';
import { IGenericBlockchain } from '../lib/blockchains/IGenericBlockchain';

export type ForeignChainReplicatorProps = {
  foreignChainId: TForeignChainsIds;
};

@injectable()
export class ForeignChainReplicator {
  private readonly replicators: { [key: string]: IForeignBlockReplicator };
  @inject('Logger') logger!: Logger;
  @inject(ForeignBlockFactory) foreignBlockFactory!: ForeignBlockFactory;
  @inject(FCDRepository) fcdRepository!: FCDRepository;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;
  @inject('Settings') private readonly settings: Settings;

  constructor(
    @inject(EthereumBlockReplicator) ethereumBlockReplicator: EthereumBlockReplicator,
    @inject(PolygonBlockReplicator) polygonBlockReplicator: PolygonBlockReplicator,
    @inject(AvalancheBlockReplicator) avalancheBlockReplicator: AvalancheBlockReplicator,
    @inject(ArbitrumBlockReplicator) arbitrumBlockReplicator: ArbitrumBlockReplicator,
    @inject(SolanaBlockReplicator) solanaBlockReplicator: SolanaBlockReplicator
  ) {
    this.replicators = {
      ethereum: ethereumBlockReplicator,
      polygon: polygonBlockReplicator,
      avax: avalancheBlockReplicator,
      arbitrum: arbitrumBlockReplicator,
      solana: solanaBlockReplicator,
    };
  }

  async apply(props: ForeignChainReplicatorProps): Promise<IForeignBlock[] | undefined> {
    const { foreignChainId } = props;
    this.logger.info(`[${foreignChainId}] Foreign Chain Block Replication initiated`);

    try {
      const { foreignChainId } = props;

      await this.checkBalanceIsEnough(foreignChainId);

      const replicator = this.replicators[foreignChainId];
      const foreignChainStatus = await replicator.getStatus();
      const blocks = await replicator.resolvePendingBlocks(foreignChainStatus, new Date());
      const replicationStatus = await replicator.replicate(blocks, foreignChainStatus);
      return await this.commit(replicationStatus, foreignChainId, foreignChainStatus.chainAddress);
    } catch (e) {
      e.message = `[${foreignChainId}] ${e.message}`;
      this.logger.error(e);
      return;
    }
  }

  private commit = async (
    replicationStatus: ReplicationStatus,
    foreignChainId: string,
    chainAddress: string
  ): Promise<IForeignBlock[] | undefined> => {
    if (!replicationStatus.blocks || replicationStatus.blocks.length == 0) return;

    if (replicationStatus.errors) {
      this.logger.error(`Block Replication Error - Errors: ${JSON.stringify(replicationStatus)}`);
      return;
    }

    if (replicationStatus.blocks.length > 1) {
      this.logger.error('multiple block replication not supported');
      return;
    }

    const foreignBlocks: IForeignBlock[] = [];

    for (let i = 0; i < replicationStatus.blocks.length; i++) {
      const block = replicationStatus.blocks[i];
      const anchor = replicationStatus.anchors[i];
      const fcds = replicationStatus.fcds[i];
      const foreignBlock = this.foreignBlockFactory.fromBlock({ block, anchor, chainAddress, foreignChainId });
      const saveData: Promise<IForeignBlock | IFCD>[] = [foreignBlock.save()];

      fcds.keys.forEach((key, k) => {
        saveData.push(
          this.fcdRepository.saveOrUpdate({
            key,
            value: replicationStatus.fcds[i].values[k],
            dataTimestamp: block.dataTimestamp,
            chainId: foreignChainId,
          })
        );
      });

      try {
        await Promise.all(saveData);
        foreignBlocks.push(foreignBlock);
      } catch (e) {
        this.logger.error(e);
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

    this.testBalanceThreshold(chainId, balance, toCurrency);
  };

  private testBalanceThreshold = (
    chainId: TForeignChainsIds,
    balance: BigNumber,
    toCurrency: (amount: string) => BigNumber
  ) => {
    const { errorLimit, warningLimit } = this.settings.blockchain.multiChains[chainId].transactions.mintBalance;
    if (balance.lt(toCurrency(errorLimit))) {
      throw new Error(`Balance is lower than ${errorLimit}`);
    }

    if (balance.lt(toCurrency(warningLimit))) {
      this.logger.warn(`Balance is lower than ${warningLimit}`);
    }
  };
}
