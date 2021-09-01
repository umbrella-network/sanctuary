import { inject, injectable } from 'inversify';
import Block from '../models/Block';
import { BlockStatus } from '../types/blocks';
import Leaf from '../models/Leaf';
import StatsdClient from 'statsd-client';

@injectable()
class BlockLeafCountReporter {
  @inject('StatsdClient') statsDClient?: StatsdClient;

  async call(): Promise<void> {
    const { blockId } = await Block.findOne({ status: BlockStatus.Finalized }).sort({ blockId: -1 });
    const leaves = await Leaf.find({ blockId });

    this.statsDClient?.gauge('Layer2DataPairs', leaves.length);
  }
}

export default BlockLeafCountReporter;
