import {inject, injectable} from 'inversify';
import {BigNumber, Contract, utils} from 'ethers';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';
import {ContractRegistry, ABI} from '@umb-network/toolbox';

@injectable()
class ChainContract {
  contract!: Contract;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(Blockchain) blockchain: Blockchain
  ) {
    new ContractRegistry(blockchain.provider, settings.blockchain.contracts.registry.address)
      .getAddress(settings.blockchain.contracts.chain.name)
      .then((chainAddress: string) => {
        this.contract = new Contract(
          chainAddress,
          ABI.chainAbi,
          blockchain.provider
        );
      });
  }

  getLeaderAddress = async (): Promise<string> => this.contract.getLeaderAddress();
  getBlockHeight = async (): Promise<BigNumber> => this.contract.getBlockHeight();
  getBlockVoters = async (height: number): Promise<string[]> => this.contract.getBlockVoters(height);
  blocks = async (index: number): Promise<utils.Result> => this.contract.blocks(index);
}

export default ChainContract;
