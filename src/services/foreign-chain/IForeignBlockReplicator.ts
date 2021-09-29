import { IBlock } from '../../models/Block';
import { ForeignChainStatus } from '../../types/ForeignChainStatus';
import { ReplicationStatus } from './ForeignBlockReplicator';

export interface IForeignBlockReplicator {
  getStatus(): Promise<ForeignChainStatus>;
  resolvePendingBlocks(status: ForeignChainStatus, referenceTime: Date): Promise<IBlock[]>;
  replicate(blocks: IBlock[], status: ForeignChainStatus): Promise<ReplicationStatus>;
}
