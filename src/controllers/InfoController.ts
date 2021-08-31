import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import Settings from '../types/Settings';
import ChainContract from '../contracts/ChainContract';
import StakingBankContract from '../contracts/StakingBankContract';
import Blockchain from '../lib/Blockchain';
import {ChainStatus} from '../types/ChainStatus';

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
    let network, status: ChainStatus | Error;

    try {
      status = await this.chainContract.resolveStatus();
    } catch (e) {
      status = e;
    }

    try {
      network = await this.blockchain.getProvider().getNetwork();
    } catch (e) {
      network = e;
    }

    response.send({
      contractRegistryAddress: this.blockchain.getContractRegistryAddress(),
      stakingBankAddress: (await this.stakingBankContract.resolveContract()).address,
      version: this.settings.version,
      environment: this.settings.environment,
      network,
      status,
    });
  };
}

export default InfoController;
