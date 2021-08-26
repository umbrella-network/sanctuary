import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import { ForeignBlockFactory } from '../factories/ForeignBlockFactory';
import { IBlock } from '../models/Block';
import { EthereumBlockReplicator, IForeignBlockReplicator } from './ForeignChain';

export type ForeignChainReplicatorProps = {
  foreignChainId: string;
}

@injectable()
export class ForeignChainReplicator {
  private replicators: { [key: string]: IForeignBlockReplicator };
  @inject('Logger') private logger!: Logger;
  @inject(ForeignBlockFactory) foreignBlockFactory: ForeignBlockFactory;

  constructor(
    @inject(EthereumBlockReplicator) ethereumBlockReplicator: EthereumBlockReplicator
  ) {
    this.replicators = {
      ethereum: ethereumBlockReplicator
    };
  }

  apply = async (props: ForeignChainReplicatorProps): Promise<void> => {
    try {
      const { foreignChainId } = props;
      const replicator = this.replicators[foreignChainId];
      const foreignChainStatus = await replicator.getStatus();
      const blocks = await replicator.resolveSynchronizableBlocks(foreignChainStatus);
      const replicatedBlocks = await replicator.synchronize(blocks, foreignChainStatus);
      await this.commit(replicatedBlocks, foreignChainId);
    } catch (e) {
      this.logger.error(e);
    }
  }

  private commit = async (blocks: IBlock[], foreignChainId: string): Promise<void> => {
    for (let block of blocks) {
      let foreignBlock = this.foreignBlockFactory.fromBlock({ block, foreignChainId });
      foreignBlock.save();
    }
  }
}
