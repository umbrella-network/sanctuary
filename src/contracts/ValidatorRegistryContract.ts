import { inject, injectable } from 'inversify';
import { Contract, utils } from 'ethers';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';
import { ContractRegistry, ABI } from '@umb-network/toolbox';

@injectable()
class ValidatorRegistryContract {
  contract!: Contract;

  constructor(@inject('Settings') settings: Settings, @inject(Blockchain) blockchain: Blockchain) {
    new ContractRegistry(blockchain.provider, settings.blockchain.contracts.registry.address)
      .getAddress(settings.blockchain.contracts.validatorRegistry.name)
      .then((validatorRegistryAddress: string) => {
        this.contract = new Contract(validatorRegistryAddress, ABI.validatorRegistryAbi, blockchain.provider);
      });
  }

  validators = async (id: string): Promise<utils.Result> => this.contract.validators(id);
}

export default ValidatorRegistryContract;
