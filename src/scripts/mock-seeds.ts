import '../boot';
import Block from '../models/Block';
import Leaf from '../models/Leaf';
import { ethers } from 'ethers';

import * as feeds from '../config/feeds.json';

async function main() {
  await Block.deleteMany({});

  for await (const i of Array(100).keys()) {
    const block = new Block({
      _id: `block::${i}`,
      height: i,
      status: 'finalized',
      anchor: 1024 + i * 8,
      timestamp: new Date(),
      root: ethers.utils.keccak256('0x1234'),
      minter: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F',
      staked: 100,
      power: 75,
      voters: ['0xA405324F4b6EB7Bc76f1964489b3769cfc71445F'],
      votes: {
        '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F': 200,
      },
    });

    await block.save();
    console.log(
      `block id = ${block.id}; height = ${block.height}; timestamp = ${block.timestamp}; root = ${block.root}`
    );

    // create leaves
    await Leaf.deleteMany({
      blockId: block.id,
    });

    for (let i = 0; i < feeds.data.length; i++) {
      const feed = feeds.data[i];

      const leaf = new Leaf({
        _id: `leaf::${block.id}::${feed.id}`,
        blockId: block.id,
        key: feed.id,
        value: 12345,
        proof: [ethers.utils.keccak256('0x1234'), ethers.utils.keccak256('0x1234'), ethers.utils.keccak256('0x1234')],
      });

      await leaf.save();
      console.log(`leaf id = ${leaf.id}; key = ${leaf.key}; value = ${leaf.value}`);
    }
  }
}

main()
  .then(() => console.log('done'))
  .finally(() => process.exit(0));
