import {inject, injectable} from 'inversify';
import {IBlock} from '../models/Block';
import {FeedValue} from '@umb-network/toolbox/dist/types/Feed';
import FCD from '../models/FCD';
import Settings from "../types/Settings";

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

    // TODO this potentially should be fetched based on feed file, but we cloning everything so we can use DB
    // NOTE: FCDs must be from the same time that block
    const homeFcdKeys = await FCD.find({chainId: this.settings.blockchain.homeChain.chainId, dataTimestamp: block.dataTimestamp});

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
