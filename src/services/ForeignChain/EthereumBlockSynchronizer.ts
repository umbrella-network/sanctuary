import { injectable } from 'inversify';
import { IBlock } from '../../models/Block';
import { IForeignBlockSynchronizer } from './IForeignBlockSynchronizer';

@injectable()
export class EthereumBlockSynchronizer implements IForeignBlockSynchronizer {

  // each synchronizer should update the block to ensure that it has been processed
  apply = async (block: IBlock): Promise<boolean> => {
    // double check if chain needs synchronization
    // magic ethereum stuff. Is this idempotent?
    // create foreign block locally
    return true;
  }

  private commit = async (block: IBlock): Promise<void> => {
    await block.update({ 'synchronization.ethereum': 'SYNCHRONIZED' });
  }
}
