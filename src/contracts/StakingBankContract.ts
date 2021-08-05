import { inject, injectable } from 'inversify';
import { Contract, utils } from 'ethers';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';
import { ContractRegistry, ABI } from '@umb-network/toolbox';

@injectable()
class StakingBankContract {
  registry!: ContractRegistry;
  settings!: Settings;
  blockchain!: Blockchain;

  constructor(@inject('Settings') settings: Settings, @inject(Blockchain) blockchain: Blockchain) {
    this.settings = settings;
    this.blockchain = blockchain;
  }

  async resolveContract(): Promise<Contract> {
    if (!this.registry) {
      this.registry = new ContractRegistry(
        this.blockchain.provider,
        this.settings.blockchain.contracts.registry.address
      );
    }

    const address = await this.registry.getAddress(this.settings.blockchain.contracts.stakingBank.name);
    return new Contract(address, ABI.stakingBankAbi, this.blockchain.provider);
  }

  async validators(id: string): Promise<utils.Result> {
    return (await this.resolveContract()).validators(id);
  }
}

export default StakingBankContract;
