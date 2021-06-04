import { BigNumber, ethers } from 'ethers';
import { ChainBlockData } from '../../src/models/ChainBlockData';

export const arbitraryBlockFromChain: ChainBlockData = {
  dataTimestamp: 1611359125,
  affidavit: BigNumber.from('0x1234567890'),
  root: ethers.utils.keccak256('0x1234'),
};
