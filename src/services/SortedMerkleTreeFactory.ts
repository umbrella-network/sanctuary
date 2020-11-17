import {injectable} from 'inversify';
import int64 from 'int64-buffer';

import SortedMerkleTree from '../lib/SortedMerkleTree';
import * as feeds from '../config/feeds.json';

@injectable()
class SortedMerkleTreeFactory {
  apply(data: Map<string, string>): SortedMerkleTree {
    console.log(Object.keys(data));
    const treeData = Array.from(data.keys()).sort()
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
