import {inject, injectable} from 'inversify';
import {IBlock} from '../models/Block';
import {FeedValue} from '@umb-network/toolbox/dist/types/Feed';
import FCD from '../models/FCD';
import Settings from '../types/Settings';

export type FetchedFCDs = {
  keys: string[];
  values: FeedValue[];
};

@injectable()
export class FCDRepository {
  @inject('Settings') settings: Settings;

  async findFCDsForReplication(block: IBlock): Promise<FetchedFCDs> {
    const keys: string[] = [];
    const values: FeedValue[] = [];

    // NOTE: FCDs must be from the same time that block, because we cloning ste state
    const homeFcdKeys = await FCD.find({
      chainId: this.settings.blockchain.homeChain.chainId,
      dataTimestamp: new Date(block.dataTimestamp.toISOString())
    });

    if (!homeFcdKeys.length) {
      return {keys, values};
    }

    homeFcdKeys.forEach(fcd => {
      keys.push(fcd.key);
      values.push(fcd.value);
    });

    return {keys, values};
  }
}
