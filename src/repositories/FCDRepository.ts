import { injectable } from 'inversify';
import { IBlock } from '../models/Block';
import { FeedValue } from '@umb-network/toolbox/dist/types/Feed';
import FCD from '../models/FCD';
import { ChainFCDsData } from '../models/ChainBlockData';
import { ChainContract } from '../contracts/ChainContract';

export type FetchedFCDs = {
  keys: string[];
  values: FeedValue[];
};

type FcdsForReplicationProps = {
  block: IBlock;
  homeChainId: string;
  homeChainContract: ChainContract;
};

@injectable()
export class FCDRepository {
  async findFCDsForReplication(props: FcdsForReplicationProps): Promise<FetchedFCDs> {
    const { block, homeChainId, homeChainContract } = props;
    const keys: string[] = [];
    const values: FeedValue[] = [];

    // TODO this potentially should be fetched based on feed file, but we cloning everything so we can use DB
    const homeFcdKeys = (await FCD.find({ chainId: homeChainId })).map((item) => item._id);

    if (!homeFcdKeys.length) {
      return { keys, values };
    }

    const [fcdsValues, fcdsTimestamps] = <ChainFCDsData>(
      await homeChainContract.resolveFCDs(block.chainAddress, homeFcdKeys)
    );

    fcdsTimestamps.forEach((timestamp, i) => {
      if (timestamp >= block.dataTimestamp.getTime() / 1000) {
        keys.push(homeFcdKeys[i]);
        values.push(fcdsValues[i]._hex);
      }
    });

    return { keys, values };
  }
}
