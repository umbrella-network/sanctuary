import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import { Contract } from 'ethers';
import { ContractRegistry } from '@umb-network/toolbox';

import StakingBankStatic from '../contracts/StakingBankStatic.json';
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
    return new Contract(bankAddress, StakingBankStatic.abi, provider);
  }

  private async getAddresses(chainId: ChainsIds): Promise<string[]> {
    const bank = await this.stakingBank(chainId);
    return bank.getAddresses();
  }

  private async fetchValidators(chainId: ChainsIds): Promise<IValidator[]> {
    const [addresses, bank] = await Promise.all([this.getAddresses(chainId), this.stakingBank(chainId)]);
    return Promise.all(addresses.map((a) => bank.validators(a)));
  }
}
