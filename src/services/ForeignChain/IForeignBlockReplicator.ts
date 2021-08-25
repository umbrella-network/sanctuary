import { IBlock } from '../../models/Block';
import { ForeignChainStatus } from '../../types/ForeignChainStatus';

export interface IForeignBlockReplicator {
  getStatus(): Promise<ForeignChainStatus>;
  resolveSynchronizableBlocks(status: ForeignChainStatus): Promise<IBlock[]>;
  synchronize(blocks: IBlock[], status: ForeignChainStatus): Promise<IBlock[]>;
}
