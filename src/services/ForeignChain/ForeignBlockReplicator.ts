import { inject } from 'inversify';
import Block, { IBlock } from '../../models/Block';
import { ForeignChainStatus } from '../../types/ForeignChainStatus';
import { IForeignBlockReplicator } from './IForeignBlockReplicator';

export abstract class ForeignBlockReplicator implements IForeignBlockReplicator {
  @inject(ForeignChainContract) foreignChainContract: ForeignChainContract;

  getStatus = async (): Promise<ForeignChainStatus> => {
    return {};
  }
  
  resolveSynchronizableBlocks = async (status: ForeignChainStatus): Promise<IBlock[]> => {
    return [new Block()];
  }

  synchronize = async (blocks: IBlock[], status: ForeignChainStatus): Promise<IBlock[]> => {
    return [new Block()];
  }
}


// import { inject, injectable } from 'inversify';
// import Block, { IBlock } from '../../models/Block';
// import { EthereumBlockSynchronizer, IForeignBlockSynchronizer } from '.';

// @injectable()
// export class ForeignBlockSynchronizer {
//   private foreignChains: { [key: string]: IForeignBlockSynchronizer };

//   constructor(
//     @inject(EthereumBlockSynchronizer) ethereumBlockSynchronizer: EthereumBlockSynchronizer
//   ) {
//     this.foreignChains = {
//       ethereum: ethereumBlockSynchronizer
//     }
//   }

//   apply = async (block: IBlock): Promise<void> => {
//     // determine which blockchains need to be synchronized
//     const unsynchronizedChainIds = this.resolveUnsynchronizedForeignChains(block);

//     // synchronize missing blockchains. Each synchronizer must be idempotent.
//     const synchronizationStates = await this.synchronize(unsynchronizedChainIds, block);

//     // set the block to synchronized if all foreign chains are done with that block
//     if (!synchronizationStates.includes(false) || unsynchronizedChainIds.length == 0) {
//       await this.commit(block);
//     }
//   }

//   // After speaking w/ Dariusz it's possible that this needs to be a bit more elaborate
//   private resolveUnsynchronizedForeignChains = (block: IBlock): string[] => {
//     const synchronizedChainIds = block.synchronization?.chains
//       ? Object.keys(block.synchronization.chains)
//       : [];
    
//     return Object.keys(this.foreignChains).filter((chainId) => !synchronizedChainIds.includes(chainId));
//   }

//   private synchronize = async (chainIds: string[], block: IBlock): Promise<boolean[]> => {
//     let synchronizationStates: boolean[] = [];

//     for (let chainId of chainIds) {
//       synchronizationStates.push(await this.foreignChains[chainId].apply(block));
//     }
    
//     return synchronizationStates;
//   }

//   private commit = async(block: IBlock): Promise<void> => {
//     await block.update({ 'synchronization.synchronizedAt': new Date() });
//   }
// }
