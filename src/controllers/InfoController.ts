import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import Settings from '../types/Settings';
import ChainContract from '../contracts/ChainContract';
import StakingBankContract from '../contracts/StakingBankContract';
import Blockchain from '../lib/Blockchain';
import { ChainStatus } from '../types/ChainStatus';
import {ForeignChainStatus} from '../types/ForeignChainStatus';

@injectable()
class InfoController {
  router: express.Application;

  constructor(
    @inject('Settings') private readonly settings: Settings,
    @inject(StakingBankContract) private readonly stakingBankContract: StakingBankContract,
    @inject(Blockchain) private readonly blockchain: Blockchain,
    @inject(ChainContract) private readonly chainContract: ChainContract
  ) {
    this.router = express().get('/', this.index);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    const chainId = <string>request.query.chainId;
    let network, status: (ChainStatus | ForeignChainStatus) | Error, chainContractAddress;

    try {
      status = await this.chainContract.setChainId(chainId).resolveStatus<ChainStatus | ForeignChainStatus>();
      chainContractAddress = status.chainAddress;
    } catch (e) {
      status = e;
    }

    try {
      network = await this.blockchain.getProvider(chainId).getNetwork();
    } catch (e) {
      network = e;
    }

    response.send({
      contractRegistryAddress: this.blockchain.getContractRegistryAddress(chainId),
      stakingBankAddress: this.chainContract.isHomeChain() ? (await this.stakingBankContract.resolveContract()).address : 'N/A',
      chainContractAddress,
      version: this.settings.version,
      environment: this.settings.environment,
      network,
      status,
    });
  };
}

export default InfoController;
