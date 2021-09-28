import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import { ForeignBlockFactory } from '../factories/ForeignBlockFactory';
import { EthereumBlockReplicator, IForeignBlockReplicator } from './foreign-chain';
import { ReplicationStatus } from './foreign-chain/ForeignBlockReplicator';
import { IForeignBlock } from '../models/ForeignBlock';
import { FCDFactory } from '../factories/FCDFactory';
import { IFCD } from '../models/FCD';

export type ForeignChainReplicatorProps = {
  foreignChainId: string;
};

@injectable()
export class ForeignChainReplicator {
  private readonly replicators: { [key: string]: IForeignBlockReplicator };
  @inject('Logger') logger!: Logger;
  @inject(ForeignBlockFactory) foreignBlockFactory: ForeignBlockFactory;
  @inject(FCDFactory) fcdFactory: FCDFactory;

  constructor(@inject(EthereumBlockReplicator) ethereumBlockReplicator: EthereumBlockReplicator) {
    this.replicators = {
      ethereum: ethereumBlockReplicator,
    };
  }

  async apply(props: ForeignChainReplicatorProps): Promise<IForeignBlock[] | undefined> {
    try {
      const { foreignChainId } = props;
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
      const foreignBlock = this.foreignBlockFactory.fromBlock({ block, anchor, chainAddress, foreignChainId });

      const saveData: Promise<IForeignBlock | IFCD>[] = [foreignBlock.save()];

      replicationStatus.fcds[i].keys.forEach((key, k) => {
        const fcd = this.fcdFactory.create({
          key,
          value: replicationStatus.fcds[i].values[k],
          dataTimestamp: block.dataTimestamp,
          chainId: foreignChainId,
        });

        saveData.push(fcd.save());
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
}
