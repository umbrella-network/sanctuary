import { injectable } from 'inversify';
import { ForeignBlockReplicator } from '.';
import Block, { IBlock } from '../../models/Block';
import { ForeignChainStatus } from '../../types/ForeignChainStatus';

@injectable()
export class EthereumBlockReplicator extends ForeignBlockReplicator {
}
