import { injectable } from 'inversify';
import { LeafType, LeafValueCoder } from '@umb-network/toolbox';

import SortedMerkleTree from '../lib/SortedMerkleTree';

@injectable()
class SortedMerkleTreeFactory {
  apply(data: Map<string, string>): SortedMerkleTree {
    const treeData = Array.from(data.keys())
      .sort()
      .map((key) => {
        const value = data.get(key);
        const converted = LeafValueCoder.encode(Number(value), LeafType.TYPE_FLOAT);
        return { [key]: converted };
      })
      .reduce((acc, v) => ({ ...acc, ...v }), {});

    return new SortedMerkleTree(treeData);
  }
}

export default SortedMerkleTreeFactory;
