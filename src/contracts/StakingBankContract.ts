import { inject, injectable } from 'inversify';
import { Contract, utils } from 'ethers';
import Settings from '../types/Settings';
import { Blockchain } from '../lib/Blockchain';
import { ContractRegistry, ABI } from '@umb-network/toolbox';
import { BlockchainRepository } from '../repositories/BlockchainRepository';

@injectable()
class StakingBankContract {
  registry!: ContractRegistry;
  settings!: Settings;
  blockchain!: Blockchain;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(BlockchainRepository) blockchainRepository: BlockchainRepository
  ) {
    this.settings = settings;
    this.blockchain = blockchainRepository.get(settings.blockchain.homeChain.chainId);
  }

  async resolveContract(): Promise<Contract> {
    if (!this.registry) {
      this.registry = new ContractRegistry(this.blockchain.getProvider(), this.blockchain.getContractRegistryAddress());
    }

    const address = await this.registry.getAddress(this.settings.blockchain.contracts.stakingBank.name);
    return new Contract(address, ABI.stakingBankAbi, this.blockchain.getProvider());
  }

  async validators(id: string): Promise<utils.Result> {
    return (await this.resolveContract()).validators(id);
  }
}

export default StakingBankContract;
