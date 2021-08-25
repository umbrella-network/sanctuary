import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import { IBlock } from '../models/Block';
import { EthereumBlockReplicator, IForeignBlockReplicator } from './ForeignChain';

export type ForeignChainReplicatorProps = {
  foreignChainId: string;
  currentTime: Date;
}

@injectable()
export class ForeignChainReplicator {
  @inject('Logger') private logger!: Logger;
  private replicators: { [key: string]: IForeignBlockReplicator };

  constructor(
    @inject(EthereumBlockReplicator) ethereumBlockReplicator: EthereumBlockReplicator
  ) {
    this.replicators = {
      ethereum: ethereumBlockReplicator
    }
  }

  apply = async (props: ForeignChainReplicatorProps): Promise<void> => {
    try {
      const { foreignChainId, currentTime } = props;
      const replicator = this.replicators[foreignChainId];
      const foreignChainStatus = await replicator.getStatus();
      const blocks = await replicator.resolveSynchronizableBlocks(foreignChainStatus);
      const synchronizedBlocks = await replicator.synchronize(blocks, foreignChainStatus);
      await this.commit(synchronizedBlocks, foreignChainId);
    } catch (e) {
      this.logger.error(e);
    }
  }

  private commit = async (blocks: IBlock[], foreignChainId: string): Promise<void> => {
    // create foreign block models based on the blocks and foreignChainId
  }
}
