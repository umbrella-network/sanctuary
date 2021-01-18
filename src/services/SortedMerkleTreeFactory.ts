import { injectable } from 'inversify';
import SortedMerkleTree from '../lib/SortedMerkleTree';
import { remove0x } from '../utils/remove-0x';

@injectable()
class SortedMerkleTreeFactory {
  apply(data: Map<string, string>): SortedMerkleTree {
    const treeData = Array.from(data.keys())
      .sort()
      .map((key) => {
        const value = data.get(key);
        const converted = Buffer.from(remove0x(value), 'hex');
        return { [key]: converted };
      })
      .reduce((acc, v) => ({ ...acc, ...v }), {});

    return new SortedMerkleTree(treeData);
  }
}

export default SortedMerkleTreeFactory;
