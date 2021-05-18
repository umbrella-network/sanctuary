import '../boot';
import Block from '../models/Block';
import Leaf from '../models/Leaf';
import { ethers } from 'ethers';
import { LeafType, LeafValueCoder } from '@umb-network/toolbox';

const exampleKeys = ['ABS-XYZ', 'XYZ-ABS', 'QWERTY-ABS', 'ABS-QWERTY', 'QWERTY-XYZ', 'XYZ-QWERTY'];

async function main() {
  await Block.deleteMany({});

  for await (const i of Array(100).keys()) {
    const block = new Block({
      _id: `block::${i}`,
      blockId: i,
      status: 'finalized',
      anchor: (1024 + i * 8).toString(),
      dataTimestamp: new Date(),
      root: ethers.utils.keccak256('0x1234'),
      minter: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F',
      staked: '100',
      power: 75,
      voters: ['0xA405324F4b6EB7Bc76f1964489b3769cfc71445F'],
      votes: {
        '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F': 200,
      },
    });

    await block.save();
    console.log(
      `id = ${block._id}; blockId = ${block.blockId}; timestamp = ${block.dataTimestamp}; root = ${block.root}`
    );

    // create leaves
    await Leaf.deleteMany({
      blockId: block._id,
    });

    for (let i = 0; i < exampleKeys.length; i++) {
      const key = exampleKeys[i];

      const leaf = new Leaf({
        _id: `leaf::${block._id}::${key}`,
        blockId: block._id,
        key: key,
        value: '0x' + LeafValueCoder.encode(12345, LeafType.TYPE_FLOAT),
        proof: [ethers.utils.keccak256('0x1234'), ethers.utils.keccak256('0x1234'), ethers.utils.keccak256('0x1234')],
      });

      await leaf.save();
      console.log(`leaf id = ${leaf._id}; key = ${leaf.key}; value = ${leaf.value}`);
    }
  }
}

main()
  .then(() => console.log('done'))
  .finally(() => process.exit(0));
