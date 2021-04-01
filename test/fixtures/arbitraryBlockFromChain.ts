import { BigNumber, ethers } from 'ethers';
import { ChainBlockDataExtended} from '../../src/models/ChainBlockData';

export const arbitraryBlockFromChain: ChainBlockDataExtended = {
  timestamp: BigNumber.from(1611359125),
  anchor: BigNumber.from(1024),
  root: ethers.utils.keccak256('0x1234'),
  minter: '0xA405324F4b6EB7Bc76f1964489b3769cfc71445F',
  staked: BigNumber.from('1000000000000000000'),
  power: BigNumber.from('1000000000000000000'),
  chainInstance: {
    address: '0x123'
  }
} as unknown as ChainBlockDataExtended;
