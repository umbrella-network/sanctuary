import { injectable, postConstruct } from 'inversify';
import { ForeignBlockReplicator } from '.';
import { ReplicationStatus } from './ForeignBlockReplicator';
import { ChainContract } from '../../contracts/ChainContract';
import { ForeignChainStatus } from '../../types/ForeignChainStatus';
import { IGenericBlockchain } from '../../lib/blockchains/IGenericBlockchain';
import { IGenericForeignChainContract } from '../../contracts/generic/IGenericForeignChainContract';
import { IBlock } from '../../models/Block';
import { FeedValue } from '@umb-network/toolbox/dist/types/Feed';

@injectable()
export abstract class GenericForeignBlockReplicator extends ForeignBlockReplicator {
  protected genericBlockchain!: IGenericBlockchain;
  protected genericForeignChainContract!: IGenericForeignChainContract;

  @postConstruct()
  protected async setup(): Promise<void> {
    this.homeBlockchain = this.blockchainRepository.get(this.settings.blockchain.homeChain.chainId);
    this.genericBlockchain = this.blockchainRepository.getGeneric(this.chainId);
    this.homeChainContract = <ChainContract>(
      this.chainContractRepository.get(this.settings.blockchain.homeChain.chainId)
    );

    this.genericForeignChainContract = this.chainContractRepository.getGeneric(this.chainId);
    await this.postSetup();
  }

  abstract async postSetup(): Promise<void>;
  abstract async replicateGeneric(
    block: IBlock,
    keys: string[],
    values: FeedValue[],
    status: ForeignChainStatus
  ): Promise<ReplicationStatus>;

  replicate = async (blocks: IBlock[], status: ForeignChainStatus): Promise<ReplicationStatus> => {
    if (blocks.length === 0) return {};
    if (blocks.length > 1) return { errors: [`[${this.chainId}] we support only one block at a time`] };
    const [block] = blocks;

    const fetchedFCDs = await this.fcdRepository.findFCDsForReplication(block);
    if (!fetchedFCDs.keys.length) {
      this.logger.warn(`[${this.chainId}] No FCDs found for replication`);
    }

    return this.replicateGeneric(block, fetchedFCDs.keys, fetchedFCDs.values, status);
  };

  getStatus = async (): Promise<ForeignChainStatus> => {
    return this.genericForeignChainContract.resolveStatus();
  };
}
