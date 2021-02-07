import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import Settings from '../types/Settings';
import ChainContract from '../contracts/ChainContract';
import ValidatorRegistryContract from '../contracts/ValidatorRegistryContract';

@injectable()
class InfoController {
  router: express.Application;

  constructor(
    @inject('Settings') private readonly settings: Settings,
    @inject(ValidatorRegistryContract) private readonly validatorRegistryContract: ValidatorRegistryContract,
    @inject(ChainContract) private readonly chainContract: ChainContract
  ) {
    this.router = express().get('/', this.index);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    response.send({
      contractRegistryAddress: this.settings.blockchain.contracts.registry.address,
      validatorRegistryAddress: this.validatorRegistryContract.contract.address,
      chainContractAddress: this.chainContract.contract.address,
      version: this.settings.version || null,
      environment: this.settings.environment || null,
    });
  };
}

export default InfoController;
