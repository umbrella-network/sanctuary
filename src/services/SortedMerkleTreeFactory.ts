import { injectable } from 'inversify';
import { KeyValuePairs } from '../types/custom';
import { remove0x } from '@umb-network/toolbox/dist/utils/helpers';
import { SortedMerkleTree } from '@umb-network/toolbox';

@injectable()
class SortedMerkleTreeFactory {
  apply(data: Map<string, string>): SortedMerkleTree {
    const treeData: KeyValuePairs = {};

    Array.from(data.keys())
      .sort()
      .forEach((key) => {
        treeData[key] = Buffer.from(remove0x(data.get(key)), 'hex');
      });

    return new SortedMerkleTree(treeData);
  }
}

export default SortedMerkleTreeFactory;
