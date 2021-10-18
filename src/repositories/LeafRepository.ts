import { injectable } from 'inversify';
import LeafModel, { ILeaf } from '../models/Leaf';

const BLOCKS_SEARCH_LIMIT = 6;

@injectable()
class LeafRepository {
  async getKeys(): Promise<string[]> {
    const [{ blockId: latestBlockId }] = await LeafModel.find().sort('-blockId').limit(1);
    const leaves = await LeafModel.find({
      blockId: { $gt: latestBlockId - BLOCKS_SEARCH_LIMIT },
    }).select('key');
    return this.serializeKeys(leaves);
  }

  private serializeKeys = (leaves: ILeaf[]): string[] => {
    const keys = leaves.map(({ key }) => key);
    const keySet = new Set<string>(keys);
    const uniqueKeys = Array.from(keySet);
    return this.sortAlphabetically(uniqueKeys);
  };

  private sortAlphabetically = (origin: string[]): string[] => {
    return origin.sort((a, b) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });
  };
}

export default LeafRepository;
