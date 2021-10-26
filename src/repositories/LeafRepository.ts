import { inject, injectable } from 'inversify';
import LeafModel, { ILeaf } from '../models/Leaf';
import { sort } from 'fast-sort';
import Settings from '../types/Settings';

@injectable()
class LeafRepository {
  @inject('Settings')
  settings!: Settings;

  async getKeys(): Promise<string[]> {
    const [{ blockId: latestBlockId }] = await LeafModel.find().sort('-blockId').limit(1);
    const leaves = await LeafModel.find({
      blockId: { $gt: latestBlockId - this.settings.repositoriesConfig.leafRepository.blockSearchInterval },
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
