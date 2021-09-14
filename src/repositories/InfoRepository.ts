import { inject, injectable } from 'inversify';
import Settings from '../types/Settings';
import StakingBankContract from '../contracts/StakingBankContract';
import Blockchain from '../lib/Blockchain';
import ChainContract from '../contracts/ChainContract';
import { ChainStatus } from '../types/ChainStatus';
import { Network } from '@ethersproject/networks';

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
  @inject(ChainContract) private readonly chainContract: ChainContract;

  getInfo = async (props: GetInfoProps): Promise<Info> => {
    const chainId = props.chainId;
    const version = this.settings.version;
    const environment = this.settings.environment;
    const network = await this.getNetworkStatus();

    // Should we getStatus for foreignChains to begin with?
    const status = await this.getStatus();
    const contractRegistryAddress = this.getContractRegistryAddress(chainId);
    const chainContractAddress = this.getChainContractAddress(status, chainId);
    let info: Info = { status, network, contractRegistryAddress, chainContractAddress, version, environment };

    if (!chainId) {
      const stakingBankAddress = await this.getStakingBankAddress();
      info = { ...info, stakingBankAddress };
    }

    return info;
  }

  private getStatus = async(): Promise<FullChainStatus> => {
    try {
      return await this.chainContract.resolveStatus<ChainStatus>();
    } catch (e) {
      return e;
    }
  }

  private getChainContractAddress = (status: FullChainStatus, chainId?: string): string | undefined => {
    if (status.constructor.name != 'ChainStatus') return undefined;
    if (!chainId) return (<ChainStatus> status).chainAddress;

    // how do we get the chain address for a foreign chain?
  }

  private getNetworkStatus = async(): Promise<NetworkStatus> => {
    try {
      return await this.blockchain.getProvider().getNetwork();
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