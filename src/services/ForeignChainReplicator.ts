import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import { ForeignBlockFactory } from '../factories/ForeignBlockFactory';
import {
  AvalancheBlockReplicator,
  EthereumBlockReplicator,
  PolygonBlockReplicator,
  IForeignBlockReplicator,
} from './foreign-chain';
import { ReplicationStatus } from './foreign-chain/ForeignBlockReplicator';
import { IForeignBlock } from '../models/ForeignBlock';
import { IFCD } from '../models/FCD';
import { FCDRepository } from '../repositories/FCDRepository';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import Settings from '../types/Settings';
import { TForeignChainsIds } from '../types/ChainsIds';

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
    @inject(AvalancheBlockReplicator) avalancheBlockReplicator: AvalancheBlockReplicator
  ) {
    this.replicators = {
      ethereum: ethereumBlockReplicator,
      polygon: polygonBlockReplicator,
      avax: avalancheBlockReplicator,
    };
  }

  async apply(props: ForeignChainReplicatorProps): Promise<IForeignBlock[] | undefined> {
    try {
      const { foreignChainId } = props;

      await this.checkBalanceIsEnough(foreignChainId);

      const replicator = this.replicators[foreignChainId];
      const foreignChainStatus = await replicator.getStatus();
      const blocks = await replicator.resolvePendingBlocks(foreignChainStatus, new Date());
      const replicationStatus = await replicator.replicate(blocks, foreignChainStatus);
      return await this.commit(replicationStatus, foreignChainId, foreignChainStatus.chainAddress);
    } catch (e) {
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
    const blockchain = this.blockchainRepository.get(chainId);
    const balance = await blockchain.wallet.getBalance();

    const { errorLimit, warningLimit } = this.settings.blockchain.multiChains[chainId].mintBalance;

    if (balance.lt(1e18 * errorLimit)) {
      throw new Error(`Balance is lower than ${errorLimit}`);
    }

    if (balance.lt(1e18 * warningLimit)) {
      this.logger.warn(`Balance is lower than ${warningLimit}`);
    }
  };
}
