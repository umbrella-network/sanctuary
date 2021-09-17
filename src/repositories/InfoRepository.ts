import { inject, injectable } from 'inversify';
import Settings from '../types/Settings';
import StakingBankContract from '../contracts/StakingBankContract';
import { ChainStatus } from '../types/ChainStatus';
import { ForeignChainStatus } from '../types/ForeignChainStatus';
import { BlockchainRepository } from './BlockchainRepository';
import { ChainContractRepository } from './ChainContractRepository';
import { BaseChainContract } from '../contracts/BaseChainContract';

type FullChainStatus = ChainStatus | ForeignChainStatus | Error;

type NetworkStatus = {
  name: string;
  id: number;
};

export type Info = {
  status: FullChainStatus;
  version: string;
  environment: string;
  network: NetworkStatus;
  contractRegistryAddress?: string;
  stakingBankAddress?: string;
  chainContractAddress?: string;
};

export type GetInfoProps = {
  chainId?: string;
};

@injectable()
export class InfoRepository {
  @inject('Settings') private readonly settings: Settings;
  @inject(StakingBankContract) private readonly stakingBankContract: StakingBankContract;
  @inject(BlockchainRepository) private readonly blockchainRepository: BlockchainRepository;
  @inject(ChainContractRepository) chainContractRepository: ChainContractRepository;

  getInfo = async (props: GetInfoProps): Promise<Info> => {
    const chainId = props.chainId || this.settings.blockchain.homeChain.chainId;
    const chainContract = await this.getChainContract(chainId);
    const version = this.settings.version;
    const environment = this.settings.environment;
    const network = await this.getNetworkStatus(chainId);
    const status = await this.getStatus(chainContract);
    const contractRegistryAddress = this.getContractRegistryAddress(chainId);
    const chainContractAddress = this.getChainContractAddress(status);
    let info: Info = { status, network, contractRegistryAddress, chainContractAddress, version, environment };

    if (!chainId) {
      const stakingBankAddress = await this.getStakingBankAddress();
      info = { ...info, stakingBankAddress };
    }

    return info;
  };

  private getStatus = async (chainContract: BaseChainContract): Promise<FullChainStatus> => {
    try {
      return await chainContract.resolveStatus<ChainStatus | ForeignChainStatus>();
    } catch (e) {
      return e;
    }
  };

  private getChainContract = async (chainId: string): Promise<BaseChainContract> => {
    try {
      return await this.chainContractRepository.get(chainId);
    } catch (e) {
      return e;
    }
  };

  private getChainContractAddress = (status: FullChainStatus): string | undefined => {
    try {
      return (<ChainStatus>status).chainAddress;
    } catch (e) {
      return e.message;
    }
  };

  private getNetworkStatus = async (chainId: string): Promise<NetworkStatus> => {
    try {
      const network = await this.blockchainRepository.get(chainId).getProvider().getNetwork();
      return { name: network.name, id: network.chainId };
    } catch (e) {
      return { name: e.message, id: -1 };
    }
  };

  private getStakingBankAddress = async (): Promise<string> =>
    (await this.stakingBankContract.resolveContract()).address;

  private getContractRegistryAddress = (chainId: string): string => {
    try {
      return this.blockchainRepository.get(chainId).getContractRegistryAddress();
    } catch (e) {
      return e.message;
    }
  };
}
