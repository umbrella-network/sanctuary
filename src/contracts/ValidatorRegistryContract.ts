import { inject, injectable } from 'inversify';
import { Contract, utils } from 'ethers';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';
import { ContractRegistry, ABI } from '@umb-network/toolbox';

@injectable()
class ValidatorRegistryContract {
  contract!: Contract;
  settings!: Settings;
  blockchain!: Blockchain;

  constructor(@inject('Settings') settings: Settings, @inject(Blockchain) blockchain: Blockchain) {
    this.settings = settings;
    this.blockchain = blockchain;
  }

  resolveContract = async (): Promise<Contract> => {
    const registry = new ContractRegistry(
      this.blockchain.provider,
      this.settings.blockchain.contracts.registry.address
    );

    const address = await registry.getAddress(this.settings.blockchain.contracts.validatorRegistry.name);
    this.contract = new Contract(address, ABI.validatorRegistryAbi, this.blockchain.provider);
    return this.contract;
  }

  validators = async (id: string): Promise<utils.Result> => (await this.resolveContract()).validators(id);
}

export default ValidatorRegistryContract;
