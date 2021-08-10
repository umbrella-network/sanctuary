import { injectable } from 'inversify';
import StatsDClient from '../lib/StatsDClient';
import Block from '../models/Block';
import { BlockStatus } from '../types/blocks';
import Leaf from '../models/Leaf';

@injectable()
class BlockLeafCountReporter {
  async call(): Promise<void> {
    const { blockId } = await Block.findOne({ status: BlockStatus.Finalized }).sort({ blockId: -1 });
    const leaves = await Leaf.find({ blockId });

    StatsDClient?.gauge('Layer2DataPairs', leaves.length);
  }
}

export default BlockLeafCountReporter;
