import { LeafType, LeafValueCoder } from '@umb-network/toolbox';
import { ILeaf } from '../models/Leaf';
import Leaf from '../models/Leaf';
import '../boot';
import { connection } from 'mongoose';

(async () => {
  const leafsNotInHexFormatCursor = Leaf
    .find({
      value: { $not: { $regex: /^0x/ } }
    })
    .cursor();

  let leaf: ILeaf = await leafsNotInHexFormatCursor.next();

  while (leaf) {
    leaf.value = '0x' + LeafValueCoder.encode(leaf.value, LeafType.TYPE_FLOAT).toString('hex');

    await leaf.save();

    leaf = await leafsNotInHexFormatCursor.next();
  }

  await connection.close();
})();
