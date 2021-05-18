import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import Settings from '../types/Settings';
import ChainContract from '../contracts/ChainContract';
import ValidatorRegistryContract from '../contracts/ValidatorRegistryContract';
import Blockchain from '../lib/Blockchain';

@injectable()
class InfoController {
  router: express.Application;

  constructor(
    @inject('Settings') private readonly settings: Settings,
    @inject(ValidatorRegistryContract) private readonly validatorRegistryContract: ValidatorRegistryContract,
    @inject(Blockchain) private readonly blockchain: Blockchain,
    @inject(ChainContract) private readonly chainContract: ChainContract
  ) {
    this.router = express().get('/', this.index);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    let chainContractAddress, network, status;

    try {
      [chainContractAddress, status] = await this.chainContract.resolveStatus();
    } catch (e) {
      chainContractAddress = e;
    }

    try {
      network = await this.blockchain.provider.getNetwork();
    } catch (e) {
      network = e;
    }

    response.send({
      contractRegistryAddress: this.settings.blockchain.contracts.registry.address,
      validatorRegistryAddress: (await this.validatorRegistryContract.resolveContract()).address,
      chainContractAddress,
      version: this.settings.version,
      environment: this.settings.environment,
      network,
      status,
    });
  };
}

export default InfoController;
