import '../boot';
import Block from '../models/Block';
import Leaf from '../models/Leaf';
import { ethers } from 'ethers';
import { LeafType, LeafValueCoder } from '@umb-network/toolbox';

const exampleKeys = [
  'eth-usd',
  'eth-eur',
  'eth-usdt',
  'usdt-eur',
  'usdt-usd',
  'wbtc-usd',
  'aave-usd',
  'yfi-usd',
  'uni-usd',
  'comp-usd',
  'eth-usd-TWAP-1day',
  'eth-usd-TWAP-30days',
  'eth-usd-VWAP-1day',
  'btc-iv-1day',
  'btc-iv-2days',
  'btc-iv-7days',
  'btc-iv-14days',
  'btc-iv-21days',
  'btc-iv-28days',
  'eth-iv-1day',
  'eth-iv-2days',
  'eth-iv-7days',
  'eth-iv-14days',
  'eth-iv-21days',
  'eth-iv-28days'
];

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

    for (let i = 0; i < exampleKeys.length; i++) {
      const key = exampleKeys[i];

      const leaf = new Leaf({
        _id: `leaf::${block.id}::${key}`,
        blockId: block.id,
        key: key,
        value: '0x' + LeafValueCoder.encode(12345, LeafType.TYPE_FLOAT),
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
