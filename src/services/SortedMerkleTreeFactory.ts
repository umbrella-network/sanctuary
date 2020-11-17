import {injectable} from 'inversify';
import int64 from 'int64-buffer';

import SortedMerkleTree from '../lib/SortedMerkleTree';

@injectable()
class SortedMerkleTreeFactory {
  apply(data: Map<string, string>): SortedMerkleTree {
    const treeData = Object.keys(data)
      .map(key => {
        const value = data.get(key);
        const converted = this.intToBuffer(Number(value));
        return {[key]: converted};
      })
      .reduce((acc, v) => ({...acc, ...v}), {});

    return new SortedMerkleTree(treeData);
  }

  private intToBuffer(i: number): Buffer {
    const hex = new int64.Int64BE(i).toBuffer().toString('hex')
    const hexInt = hex.replace(/^0+/g, '')
    return Buffer.from(`${hexInt.length % 2 === 0 ? '' : '0'}${hexInt}`, 'hex')
  }
}

export default SortedMerkleTreeFactory;
