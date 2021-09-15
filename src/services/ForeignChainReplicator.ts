import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import { ForeignBlockFactory } from '../factories/ForeignBlockFactory';
import { EthereumBlockReplicator, IForeignBlockReplicator } from './foreign-chain';
import { ReplicationStatus } from './foreign-chain/ForeignBlockReplicator';
import { IForeignBlock } from '../models/ForeignBlock';

export type ForeignChainReplicatorProps = {
  foreignChainId: string;
};

@injectable()
export class ForeignChainReplicator {
  private readonly replicators: { [key: string]: IForeignBlockReplicator };
  @inject('Logger') logger!: Logger;
  @inject(ForeignBlockFactory) foreignBlockFactory: ForeignBlockFactory;

  constructor(@inject(EthereumBlockReplicator) ethereumBlockReplicator: EthereumBlockReplicator) {
    this.replicators = {
      ethereum: ethereumBlockReplicator,
    };
  }

  apply = async (props: ForeignChainReplicatorProps): Promise<void> => {
    try {
      const { foreignChainId } = props;
      const replicator = this.replicators[foreignChainId];
      const foreignChainStatus = await replicator.getStatus();
      const blocks = await replicator.resolvePendingBlocks(foreignChainStatus, new Date());
      const replicationStatus = await replicator.replicate(blocks, foreignChainStatus);
      await this.commit(replicationStatus, foreignChainId);
    } catch (e) {
      this.logger.error(e);
    }
  };

  private commit = async (replicationStatus: ReplicationStatus, foreignChainId: string): Promise<void> => {
    if (replicationStatus.errors) {
      this.logger.error(`Block Replication Error - Errors: ${replicationStatus}`);
      return;
    }

    if (!replicationStatus.blocks) {
      this.logger.error(`Block Replication Error - Missing Blocks: ${replicationStatus}`);
      return;
    }

    for (let i = 0; i < replicationStatus.blocks.length; i++) {
      const block = replicationStatus.blocks[i];
      const anchor = replicationStatus.anchors[i];
      const foreignBlock = this.foreignBlockFactory.fromBlock({ block, anchor, foreignChainId });

      try {
        await foreignBlock.save();
      } catch (e) {
        this.logger.error(e);
      }
    }
  };
}
