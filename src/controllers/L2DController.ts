import { inject, injectable, postConstruct } from 'inversify';
import StatsdClient from 'statsd-client';
import { Request, Response, Router } from 'express';

import { ProjectAuthenticationMiddleware } from '../middleware/ProjectAuthenticationMiddleware';
import { BlockRepository } from '../repositories/BlockRepository';
import Leaf from '../models/Leaf';
import Settings from '../types/Settings';
import { extractChainId, replyWithLeaves } from './helpers';

@injectable()
export class L2DController {
  @inject('StatsdClient')
  private statsdClient?: StatsdClient;

  @inject(ProjectAuthenticationMiddleware)
  private projectAuthenticationMiddleware: ProjectAuthenticationMiddleware;

  @inject(BlockRepository)
  private blockRepository: BlockRepository;

  @inject('Settings')
  private settings: Settings;

  router: Router;

  private ignoredFields = { _id: 0, __v: 0 };

  @postConstruct()
  setup(): void {
    this.router = Router()
      .use(this.projectAuthenticationMiddleware.apply)
      .get('/', this.index)
      .get('/:chainId/latest', this.index)
      .get('/:blockId', this.index)
      .get('/:chainId/:blockId', this.index);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    this.statsdClient?.increment('sanctuary.l2d-controller.index', undefined, {
      projectId: request.params.currentProjectId,
    });

    const chainId = extractChainId(request);
    const blockId = await this.extractBlockIdOrGetLatestId(request, chainId);

    if (!blockId) {
      response.status(404).end();
      return;
    }

    const keys = (request.query.keys as string).split(',');

    if (keys.length === 0) {
      response.status(400).end();
      return;
    }

    const leaves = await Leaf.find({ blockId, key: { $in: keys } }, this.ignoredFields).exec();
    replyWithLeaves(response, leaves);
  };

  private async extractBlockIdOrGetLatestId(request: Request, chainId?: string): Promise<number | undefined> {
    const blockId = parseInt(<string>request.params.blockId);

    if (!isNaN(blockId)) {
      const block = await this.blockRepository.findOne({ blockId, chainId });
      return block?.blockId;
    }

    const block = await this.blockRepository.findLatest({ chainId });
    return block?.blockId;
  }
}
