import { inject, injectable } from 'inversify';
import Settings from '../types/Settings';
import StakingBankContract from '../contracts/StakingBankContract';
import Blockchain from '../lib/Blockchain';
import ChainContract from '../contracts/ChainContract';
import { ChainStatus } from '../types/ChainStatus';
import { Network } from '@ethersproject/networks';
import { ChainContractProvider } from '../factories/ChainContractFactory';

type FullChainStatus = ChainStatus | Error;
type NetworkStatus = Network | Error;

export type Info = {
  status: FullChainStatus;
  version: string;
  environment: string;
  network: NetworkStatus;
  contractRegistryAddress?: string;
  stakingBankAddress?: string;
  chainContractAddress?: string;
}

export type GetInfoProps = {
  chainId?: string;
}

@injectable()
export class InfoRepository {
  @inject('Settings') private readonly settings: Settings;
  @inject(StakingBankContract) private readonly stakingBankContract: StakingBankContract;
  @inject(Blockchain) private readonly blockchain: Blockchain;
  @inject('ChainContractProvider') chainContractProvider: ChainContractProvider;

  getInfo = async (props: GetInfoProps): Promise<Info> => {
    const chainId = props.chainId;
    const chainContract = await this.chainContractProvider(chainId);
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
  }

  private getStatus = async(chainContract: ChainContract): Promise<FullChainStatus> => {
    try {
      return await chainContract.resolveStatus<ChainStatus>();
    } catch (e) {
      return e;
    }
  }

  private getChainContractAddress = (status: FullChainStatus): string | undefined => {
    if (status.constructor.name != 'ChainStatus') return undefined;
    return (<ChainStatus> status).chainAddress;
  }

  private getNetworkStatus = async (chainId?: string): Promise<NetworkStatus> => {
    try {
      return await this.blockchain.getProvider(chainId).getNetwork();
    } catch (e) {
      return e;
    }
  }

  private getStakingBankAddress = async (): Promise<string> =>
    (await this.stakingBankContract.resolveContract())
      .address;

  private getContractRegistryAddress = (chainId?: string): string => this
    .blockchain
    .getContractRegistryAddress(chainId);
}