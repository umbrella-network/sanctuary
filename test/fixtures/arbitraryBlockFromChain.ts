import { BigNumber, ethers } from 'ethers';
import { ChainBlockDataExtended} from '../../src/models/ChainBlockData';
import {IChainInstance} from '../../src/models/ChainInstance';

export const arbitraryBlockFromChain: ChainBlockDataExtended = {
  dataTimestamp: 1611359125,
  affidavit: BigNumber.from('0x1234567890'),
  root: ethers.utils.keccak256('0x1234'),
  blockId: 10,
  chainInstance: <IChainInstance>{
    address: '0x123',
    dataTimestamp: new Date()
  }
};
