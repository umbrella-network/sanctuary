import { inject, injectable } from 'inversify';
import fs from 'fs';
import path from 'path';
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';
import settings from '../config/settings';

@injectable()
class ChainContract {
  static ABI: AbiItem[] = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, './ChainContract.abi.json'), 'utf-8')
  );

  contract: Contract;

  constructor(
    @inject(Web3) web3: Web3
  ) {
    this.contract = new web3.eth.Contract(
      ChainContract.ABI,
      settings.blockchain.contracts.chain.address
    );
  }

  getLeaderAddress = async (): Promise<string> => {
    //return '0x0';
    console.log(this.contract.methods.blocks(1).call());
    return this.contract.methods.getBlockHeight().call({from: '0xb0e025BE8c23F20684B4649d0345623533b85e8b'});
  }

  submit = (): void => {
    // this.contract.methods.submit().call();
    console.log('====================');
    console.log('submitted!');
    console.log('====================');
  }
}

export default ChainContract;
