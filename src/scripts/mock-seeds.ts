import '../boot';
import Application from '../lib/Application';
import Block, { IBlock } from '../models/Block';
import Leaf, { ILeaf } from '../models/Leaf';
import { ethers, Wallet } from 'ethers';

import * as feeds from '../config/feeds.json';

async function main() {
  await Block.deleteMany();

  for await (let i = 0; i < 100; i++) {
    const block = new Block({
      _id: `block::${i}`,
      height: i,
      status: 'finalized',
      anchor: 1024 + (i * 8),
      timestamp: new Date(),
      root: ethers.utils.keccak256('0x1234'),
      minter: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F',
      staked: 100,
      power: 75,
      voters: [
        '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F'
      ],
      votes: {
        '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F': 200
      }
    });
  
    await block.save();
    console.log(`block id = ${block.id}; height = ${block.height}; timestamp = ${block.timestamp}; root = ${block.root}`);
  
    // create leaves
    await Leaf.deleteMany({
      blockId: block.id
    });
  
    for (let i = 0; i < feeds.data.length; i++) {
      const feed = feeds.data[i];
  
      const leaf = new Leaf({
        _id: `leaf::${block.id}::${feed.id}`,
        blockId: block.id,
        key: feed.id,
        value: ethers.utils.keccak256('0x1234'),
        proof: [
          ethers.utils.keccak256('0x1234'),
          ethers.utils.keccak256('0x1234'),
          ethers.utils.keccak256('0x1234')
        ]
      });

      await leaf.save();
      console.log(`leaf id = ${leaf.id}; key = ${leaf.key}; value = ${leaf.value}`);
    }
  }
}

main(() => {
  console.log('done');
}).catch(e => {
  console.error(e);
}).finally(() => {
  process.exit(0);
});
