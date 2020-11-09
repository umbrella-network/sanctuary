import { inject, injectable } from 'inversify';
import fs from 'fs';
import path from 'path';
import { Contract, ContractInterface, BigNumber, utils } from 'ethers';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';

@injectable()
class ValidatorRegistryContract {
  static ABI: ContractInterface = fs.readFileSync(path.resolve(__dirname, './ValidatorRegistryContract.abi.json'), 'utf-8');

  contract!: Contract;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(Blockchain) blockchain: Blockchain
  ) {
    this.contract = new Contract(
      settings.blockchain.contracts.validatorRegistry.address,
      ValidatorRegistryContract.ABI,
      blockchain.provider
    ).connect(blockchain.wallet);
  }

  validators = async (id: String): Promise<utils.Result> => this.contract.validators(id);
}

export default ValidatorRegistryContract;
