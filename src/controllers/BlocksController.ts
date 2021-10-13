import { inject, injectable, postConstruct } from 'inversify';
import StatsdClient from 'statsd-client';
import { AuthenticationMiddleware } from '../middleware/AuthenticationMiddleware';
import { Request, Response, Router } from 'express';
import { BlockRepository } from '../repositories/BlockRepository';
import Leaf from '../models/Leaf';
import Settings from '../types/Settings';

@injectable()
export class BlocksController {
  @inject('StatsdClient')
  private statsdClient?: StatsdClient;

  @inject(AuthenticationMiddleware)
  private authenticationMiddleware: AuthenticationMiddleware;

  @inject(BlockRepository)
  private blockRepository: BlockRepository;

  @inject('Settings')
  private settings: Settings;

  router: Router;

  @postConstruct()
  setup(): void {
    this.router = Router()
      .use(this.authenticationMiddleware.apply)
      .get('/', this.index)
      .get('/latest', this.latest)
      .get('/:blockId', this.show)
      .get('/:blockId/leaves', this.leaves);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    await this.statsdClient?.increment('sanctuary.blocks-controller.index', 1, {
      projectId: request.params.currentProjectId,
    });

    const chainId = this.extractChainId(request);
    const offset = parseInt(<string>request.query.offset || '0');
    const limit = Math.min(parseInt(<string>request.query.limit || '100'), 100);
    const blocks = await this.blockRepository.find({ chainId, offset, limit });
    response.send(blocks);
  };

  latest = async (request: Request, response: Response): Promise<void> => {
    const chainId = this.extractChainId(request);
    const latestBlock = await this.blockRepository.findLatest({ chainId });
    response.send({ data: latestBlock });
  };

  show = async (request: Request, response: Response): Promise<void> => {
    this.statsdClient?.increment('sanctuary.blocks-controller.show', 1, {
      projectId: request.params.currentProjectId,
    });

    const chainId = this.extractChainId(request);
    const blockId = parseInt(<string>request.params.blockId);
    const block = await this.blockRepository.findOne({ blockId, chainId });

    if (block) {
      response.send({ data: block });
    } else {
      response.status(404).end();
    }
  };

  leaves = async (request: Request, response: Response): Promise<void> => {
    this.statsdClient?.increment('sanctuary.blocks-controller.leaves', undefined, {
      projectId: request.params.currentProjectId,
    });

    const chainId = this.extractChainId(request);
    const blockId = parseInt(<string>request.params.blockId);
    const block = await this.blockRepository.findOne({ blockId, chainId });

    if (block) {
      const leaves = await Leaf.find({ blockId: parseInt(request.params.blockId, 10) });
      response.send(leaves);
    } else {
      response.status(404).end();
    }
  };

  private extractChainId(request: Request): string | undefined {
    const chainId = <string>request.query.chainId;
    if (chainId == this.settings.blockchain.homeChain.chainId) return;

    return chainId;
  }
}
