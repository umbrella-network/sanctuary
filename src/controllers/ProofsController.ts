import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import Leaf from '../models/Leaf';
import { BlockStatus } from '../types/blocks';
import StatsdClient from 'statsd-client';
import Settings from '../types/Settings';
import { BlockRepository } from '../repositories/BlockRepository';

@injectable()
class ProofsController {
  @inject('StatsdClient')
  private statsdClient?: StatsdClient;

  @inject(BlockRepository)
  private blockRepository: BlockRepository;

  @inject('Settings')
  private settings: Settings;

  router: express.Router;

  constructor() {
    this.router = express.Router().get('/', this.index);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    this.statsdClient?.increment('sanctuary.proofs-controller.index', undefined, {
      projectId: request.params.currentProjectId,
    });

    const chainId = this.extractChainId(request);
    const block = await this.blockRepository.findLatest({ chainId, status: BlockStatus.Finalized });

    if (block) {
      const keys = (request.query.keys || []) as string[];
      const leaves = await Leaf.find({ blockId: block.blockId, key: { $in: keys } });
      response.send({ data: { block, keys, leaves } });
    } else {
      response.send({ data: {} });
    }
  };

  private extractChainId(request: Request): string | undefined {
    const chainId = <string>request.query.chainId;
    if (chainId == this.settings.blockchain.homeChain.chainId) return;

    return chainId;
  }
}

export default ProofsController;
