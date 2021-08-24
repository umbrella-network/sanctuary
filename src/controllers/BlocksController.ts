import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import Block from '../models/Block';
import Leaf from '../models/Leaf';
import { AuthUtils } from '../services/AuthUtils';
import { BlockStatus } from '../types/blocks';
import StatsDClient from '../lib/statsDClient';
import StatsdClient from 'statsd-client';

@injectable()
class BlocksController {
  @inject('StatsdClient') statsdClient?: StatsdClient;

  router: express.Application;

  constructor(@inject(AuthUtils) private readonly authUtils: AuthUtils) {
    this.router = express()
      .get('/', this.index)
      .get('/latest', this.latest)
      .get('/:id', this.show)
      .get('/:id/leaves', this.leaves);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    const apiKeyVerificationResult = await this.authUtils.verifyApiKey(request, response);

    if (!apiKeyVerificationResult.apiKey) {
      return;
    }

    this.statsdClient?.increment('sanctuary.blocks-controller.index', undefined, {
      projectId: apiKeyVerificationResult.apiKey.projectId,
    });

    const offset: number = parseInt(<string>request.query.offset || '0');
    const limit: number = Math.min(parseInt(<string>request.query.limit || '100', 10), 100);

    const blocks = await Block.find({ status: { $in: [BlockStatus.Finalized] } })
      .skip(offset)
      .limit(limit)
      .sort({ blockId: -1 })
      .exec();

    response.send(blocks);
  };

  latest = async (request: Request, response: Response): Promise<void> => {
    const block = await Block.findOne().sort({ blockId: -1 });

    response.send({ data: block });
  };

  show = async (request: Request, response: Response): Promise<void> => {
    const apiKeyVerificationResult = await this.authUtils.verifyApiKey(request, response);

    if (!apiKeyVerificationResult.apiKey) {
      return;
    }

    this.statsdClient?.increment('sanctuary.blocks-controller.show', undefined, {
      projectId: apiKeyVerificationResult.apiKey.projectId,
    });

    let blockId = -1;

    try {
      blockId = parseInt(request.params.id, 10);
    } catch (_) {
      // ignore
    }

    const [block] = await Block.find({ blockId });
    response.send({ data: block });
  };

  leaves = async (request: Request, response: Response): Promise<void> => {
    const apiKeyVerificationResult = await this.authUtils.verifyApiKey(request, response);

    if (!apiKeyVerificationResult.apiKey) {
      return;
    }

    this.statsdClient?.increment('sanctuary.blocks-controller.leaves', undefined, {
      projectId: apiKeyVerificationResult.apiKey.projectId,
    });

    const leaves = await Leaf.find({ blockId: parseInt(request.params.id, 10) });
    response.send(leaves);
  };
}

export default BlocksController;
