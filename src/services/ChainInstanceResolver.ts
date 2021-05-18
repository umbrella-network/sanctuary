import { inject, injectable } from 'inversify';
import { Logger } from 'winston';

import ChainInstance, { IChainInstance } from '../models/ChainInstance';

@injectable()
export class ChainInstanceResolver {
  @inject('Logger') private logger!: Logger;

  async apply(blockId: number): Promise<IChainInstance | undefined> {
    const chainInstances: IChainInstance[] = await ChainInstance.find({});

    const sortDesc = (a: IChainInstance, b: IChainInstance): number =>
      a.blocksCountOffset === b.blocksCountOffset
        ? a.dataTimestamp > b.dataTimestamp
          ? 1
          : -1
        : b.blocksCountOffset - a.blocksCountOffset;

    const found = chainInstances
      .sort((a, b) => sortDesc(a, b))
      .find((chainInstance) => chainInstance.blocksCountOffset <= blockId);

    found
      ? this.logger.debug(`resolved chain ${found.address} for blockId: ${blockId}`)
      : this.logger.error(`Can't resolve chain instance for blockId: ${blockId}`);

    return found;
  }
}
