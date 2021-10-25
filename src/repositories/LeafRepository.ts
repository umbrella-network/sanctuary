import { injectable } from 'inversify';
import LeafModel, { ILeaf } from '../models/Leaf';
import { sort } from 'fast-sort';

const BLOCKS_SEARCH_LIMIT = 6;

@injectable()
class LeafRepository {
  async getKeys(): Promise<string[]> {
    const [{ blockId: latestBlockId }] = await LeafModel.find().sort('-blockId').limit(1);
    const leaves = await LeafModel.find({
      blockId: { $gt: latestBlockId - BLOCKS_SEARCH_LIMIT },
    }).select('key');
    return this.formatKeys(leaves);
  }

  private formatKeys = (leaves: ILeaf[]): string[] => {
    const keys = leaves.map(({ key }) => key);
    const keySet = new Set<string>(keys);
    const uniqueKeys = Array.from(keySet);
    return sort(uniqueKeys).asc();
  };
}

export default LeafRepository;
