import { inject, injectable } from 'inversify';
import { IBlock } from '../models/Block';
import { FeedValue } from '@umb-network/toolbox/dist/types/Feed';
import FCD, { IFCD } from '../models/FCD';
import Settings from '../types/Settings';
import { FCDFactory } from '../factories/FCDFactory';

export type FetchedFCDs = {
  keys: string[];
  values: FeedValue[];
};

type SaveOrUpdateProps = {
  key: string;
  value: FeedValue;
  dataTimestamp: Date;
  chainId: string;
};

@injectable()
export class FCDRepository {
  @inject('Settings') settings: Settings;
  @inject(FCDFactory) fcdFactory: FCDFactory;

  async findFCDsForReplication(block: IBlock): Promise<FetchedFCDs> {
    const keys: string[] = [];
    const values: FeedValue[] = [];

    // NOTE: FCDs must be from the same time that block, because we cloning ste state
    const homeFcdKeys = await FCD.find({
      chainId: this.settings.blockchain.homeChain.chainId,
      // we are waiting for confirmations,
      // so there is change FCDs will not exists anymore in DB for exact time for a block
      // that's why we replicating everything that was send after (so it might be more fresh)
      // TODO perfect solution would be copy data from original tx data
      dataTimestamp: { $gte: new Date(block.dataTimestamp.toISOString()) },
    });

    if (!homeFcdKeys.length) {
      return { keys, values };
    }

    homeFcdKeys.forEach((fcd) => {
      keys.push(fcd.key);
      values.push(fcd.value);
    });

    return { keys, values };
  }

  async saveOrUpdate(props: SaveOrUpdateProps): Promise<IFCD> {
    const fcd = this.fcdFactory.create({
      key: props.key,
      value: props.value,
      dataTimestamp: props.dataTimestamp,
      chainId: props.chainId,
    });

    return FCD.findOneAndUpdate(
      { _id: fcd._id },
      {
        dataTimestamp: fcd.dataTimestamp,
        key: fcd.key,
        value: fcd.value,
        chainId: fcd.chainId,
      },
      { new: true, upsert: true }
    );
  }
}
