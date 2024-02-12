import { Logger } from 'winston';
import { ABI, ContractRegistry } from '@umb-network/toolbox';
import { inject, injectable } from 'inversify';
import { Contract } from 'ethers';

import { ChainsIds } from '../types/ChainsIds';
import { BlockchainScannerRepository } from './BlockchainScannerRepository';
import Settings, { BlockchainSettings } from '../types/Settings';
import { IValidator } from '../models/Validator';

@injectable()
export class StakingBankValidatorsRepository {
  @inject('Logger') private logger!: Logger;
  @inject('Settings') protected settings!: Settings;

  @inject(BlockchainScannerRepository) private blockchainScannerRepository!: BlockchainScannerRepository;

  async apply(chainId: ChainsIds): Promise<IValidator[]> {
    return this.fetchValidators(chainId);
  }

  private async stakingBank(chainId: ChainsIds): Promise<Contract> {
    const provider = this.blockchainScannerRepository.get(chainId).getProvider();

    const registry = new ContractRegistry(
      provider,
      (this.settings.blockchain.multiChains as Record<string, BlockchainSettings>)[chainId].contractRegistryAddress
    );

    const bankAddress = await registry.getAddress(this.settings.blockchain.contracts.stakingBank.name);
    return new Contract(bankAddress, ABI.stakingBankAbi, provider);
  }

  private async numberOfValidators(chainId: ChainsIds): Promise<number> {
    const bank = await this.stakingBank(chainId);
    return bank.numberOfValidators();
  }

  private async fetchValidators(chainId: ChainsIds): Promise<IValidator[]> {
    const n = await this.numberOfValidators(chainId);
    const bank = await this.stakingBank(chainId);

    const awaits = [];

    for (let i = 0; i < n; i++) {
      awaits.push(bank.validators(i));
    }

    return Promise.all(awaits);
  }
}