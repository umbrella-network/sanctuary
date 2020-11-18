import { inject, injectable } from 'inversify';
import fs from 'fs';
import path from 'path';
import { Contract, ContractInterface, BigNumber, utils } from 'ethers';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';

@injectable()
class ChainContract {
  static ABI: ContractInterface = fs.readFileSync(path.resolve(__dirname, './ChainContract.abi.json'), 'utf-8');

  contract!: Contract;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(Blockchain) blockchain: Blockchain
  ) {
    this.contract = new Contract(
      settings.blockchain.contracts.chain.address,
      ChainContract.ABI,
      blockchain.provider
    ).connect(blockchain.wallet);
  }

  getInterval = async (): Promise<BigNumber> => this.contract.interval();
  getLeaderAddress = async (): Promise<string> => this.contract.getLeaderAddress();
  getBlockHeight = async (): Promise<BigNumber> => this.contract.getBlockHeight();
  getBlockVoters = async (height: number): Promise<string[]> => this.contract.getBlockVoters(height);
  blocks = async (index: number): Promise<utils.Result> => this.contract.blocks(index);

  submit = async (root: string, v: number[], r: string[], s: string[]): Promise<void> => this
    .contract
    .submit(root, [], [], v, r, s);
}

export default ChainContract;
