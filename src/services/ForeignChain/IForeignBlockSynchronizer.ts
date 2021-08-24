import { IBlock } from '../../models/Block';

export interface IForeignBlockSynchronizer {
  apply(block: IBlock): Promise<boolean>
}
