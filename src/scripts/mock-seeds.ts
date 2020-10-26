import '../boot';
import Application from '../lib/Application';
import Block, { IBlock } from '../models/Block';
import Leaf, { ILeaf } from '../models/Leaf';
import { ethers, Wallet } from 'ethers';

import * as feeds from '../config/feeds.json';

for (let i = 0; i < 100; i++) {
  const block = new Block({
    _id: `blocks::${i}`,
    height: i,
    ancor: 1024 + (i * 8),
    timestamp: new Date().toISOString(),
    root: ethers.utils.keccak256('0x1234'),
    minter: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F',
    staked: 100,
    power: 75,
    voters: [
      '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F'
    ]
  });

  block.save();
  console.log(`block id = ${block.id}; height = ${block.height}; timestamp = ${block.timestamp}; root = ${block.root}`);

  // create leaves
  Leaf.remove({
    blockId: block.id
  });

  for (let i = 0; i < feeds.data.length; i++) {
    const feed = feeds.data[i];

    const leaf = new Leaf({
      _id: `leafs::${block.id}::${feed.id}`,
      blockId: block.id,
      key: feed.id,
      value: ethers.utils.keccak256('0x1234')
    });

    leaf.save();
    console.log(`leaf id = ${leaf.id}; key = ${leaf.key}; value = ${leaf.value}`);
  }
}

process.exit(0);
