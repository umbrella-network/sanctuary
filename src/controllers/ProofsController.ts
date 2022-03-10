import { inject, injectable, postConstruct } from 'inversify';
import express, { Request, Response, Router } from 'express';
import Leaf from '../models/Leaf';
import { BlockStatus } from '../types/blocks';
import StatsdClient from 'statsd-client';
import Settings from '../types/Settings';
import { BlockRepository } from '../repositories/BlockRepository';
import { ProjectAuthenticationMiddleware } from '../middleware/ProjectAuthenticationMiddleware';

@injectable()
class ProofsController {
  @inject('StatsdClient')
  private statsdClient?: StatsdClient;

  @inject(ProjectAuthenticationMiddleware)
  private projectAuthenticationMiddleware: ProjectAuthenticationMiddleware;

  @inject(BlockRepository)
  private blockRepository: BlockRepository;

  @inject('Settings')
  private settings: Settings;

  router: express.Router;

  @postConstruct()
  setup(): void {
    this.router = this.router = Router().use(this.projectAuthenticationMiddleware.apply).get('/', this.index);
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

      if (response.locals.isAuthorized) {
        const data = { block, keys, leaves };

        response.send({ data });
        return;
      }

      const data = {
        block,
        keys,
        leaves: leaves.map((leaf) => {
          leaf.proof = [];
          return leaf;
        }),
      };

      response.send({
        data,
      });
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
