import { inject, injectable } from 'inversify';
import { BigNumber, Contract, utils } from 'ethers';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';
import { ContractRegistry, ABI } from '@umb-network/toolbox';

@injectable()
class ChainContract {
  registry!: ContractRegistry;
  settings!: Settings;
  blockchain!: Blockchain;

  constructor(@inject('Settings') settings: Settings, @inject(Blockchain) blockchain: Blockchain) {
    this.settings = settings;
    this.blockchain = blockchain;
  }

  resolveContract = async (): Promise<Contract> => {
    if (!this.registry) {
      this.registry = new ContractRegistry(
        this.blockchain.provider,
        this.settings.blockchain.contracts.registry.address,
      );
    }

    const chainAddress = await this.registry.getAddress(this.settings.blockchain.contracts.chain.name);
    return new Contract(chainAddress, ABI.chainAbi, this.blockchain.provider);
  };

  getLeaderAddress = async (): Promise<string> => (await this.resolveContract()).getLeaderAddress();
  getBlockHeight = async (): Promise<BigNumber> => (await this.resolveContract()).getBlockHeight();
  getBlockVoters = async (height: number): Promise<string[]> => (await this.resolveContract()).getBlockVoters(height);
  getBlockVotes = async (blockHeight: number, voter: string): Promise<BigNumber> => {
    return (await this.resolveContract()).getBlockVotes(blockHeight, voter);
  };
  blocks = async (index: number): Promise<utils.Result> => (await this.resolveContract()).blocks(index);
}

export default ChainContract;
