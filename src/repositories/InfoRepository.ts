import { inject, injectable } from 'inversify';
import Settings from '../types/Settings';
import StakingBankContract from '../contracts/StakingBankContract';
import { ChainStatus } from '../types/ChainStatus';
import { ForeignChainStatus } from '../types/ForeignChainStatus';
import { BlockchainRepository } from './BlockchainRepository';
import { ChainContractRepository } from './ChainContractRepository';
import { BaseChainContract } from '../contracts/BaseChainContract';
import { ChainsIds, NonEvmChainsIds } from '../types/ChainsIds';
import { IGenericForeignChainContract } from '../contracts/generic/IGenericForeignChainContract';
import { NetworkStatus, NetworkStatusWithBlock } from '../types/Network';

type FullChainStatus = ChainStatus | ForeignChainStatus | Error;

export type Info = {
  status: FullChainStatus;
  version: string;
  environment: string;
  network: NetworkStatus;
  feeds: string;
  feedsOnChain: string;
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
    const chainId = props.chainId;
    const chainContract = await this.getChainContract(chainId);
    const version = this.settings.version;
    const environment = this.settings.environment;
    const network = await this.getNetworkStatus(chainId);
    const status = await this.getStatus(chainContract);
    const contractRegistryAddress = this.getContractRegistryAddress(chainId);
    const chainContractAddress = this.getChainContractAddress(status);

    const info: Info = {
      status,
      network,
      contractRegistryAddress,
      chainContractAddress,
      version,
      environment,
      feeds: this.settings.app.feedsFile,
      feedsOnChain: this.settings.app.feedsOnChain,
    };

    if (!chainId) {
      info.stakingBankAddress = await this.getStakingBankAddress();
    }

    return info;
  };

  private getStatus = async (
    chainContract: BaseChainContract | IGenericForeignChainContract
  ): Promise<FullChainStatus> => {
    try {
      return await chainContract.resolveStatus<ChainStatus | ForeignChainStatus>();
    } catch (e) {
      return e;
    }
  };

  private getChainContract = async (chainId: string): Promise<BaseChainContract | IGenericForeignChainContract> => {
    try {
      if (NonEvmChainsIds.includes(<ChainsIds>chainId)) {
        return await this.chainContractRepository.getGeneric(chainId);
      }

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

  private getNetworkStatus = async (chainId: string): Promise<NetworkStatusWithBlock> => {
    try {
      if (NonEvmChainsIds.includes(<ChainsIds>chainId)) {
        const network = await this.blockchainRepository.getGeneric(chainId).getProvider().getNetwork();
        const blockNumber = await this.blockchainRepository.getGeneric(chainId).getProvider().getBlockNumber();

        return { ...network, blockNumber };
      }

      const network = await this.blockchainRepository.get(chainId).getProvider().getNetwork();
      const blockNumber = await this.blockchainRepository.get(chainId).getProvider().getBlockNumber();
      return { name: network.name, id: network.chainId, blockNumber };
    } catch (e) {
      return { name: e.message, id: -1, blockNumber: -1 };
    }
  };

  private getStakingBankAddress = async (): Promise<string> =>
    (await this.stakingBankContract.resolveContract()).address;

  private getContractRegistryAddress = (chainId: string): string => {
    try {
      if (NonEvmChainsIds.includes(<ChainsIds>chainId)) {
        return this.blockchainRepository.getGeneric(chainId).getContractRegistryAddress();
      }

      return this.blockchainRepository.get(chainId).getContractRegistryAddress();
    } catch (e) {
      return e.message;
    }
  };
}
