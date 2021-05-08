import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import Block from '../models/Block';
import Leaf from '../models/Leaf';
import { AuthUtils } from '../services/AuthUtils';
import { BlockStatus } from '../types/BlockStatuses';
import StatsDClient from '../lib/StatsDClient';

@injectable()
class BlocksController {
  router: express.Application;

  constructor(@inject(AuthUtils) private readonly authUtils: AuthUtils) {
    this.router = express().get('/', this.index).get('/:id', this.show).get('/:id/leaves', this.leaves);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    const apiKeyVerificationResult = await this.authUtils.verifyApiKey(request, response);

    if (!apiKeyVerificationResult.apiKey) {
      return;
    }

    StatsDClient?.increment('sanctuary.blocks-controller.index', undefined, {
      projectId: apiKeyVerificationResult.apiKey.projectId,
    });

    const offset: number = parseInt(<string>request.query.offset || '0');
    const limit: number = Math.min(parseInt(<string>request.query.limit || '100', 10), 100);

    const blocks = await Block.find({ status: BlockStatus.Finalized })
      .skip(offset)
      .limit(limit)
      .sort({ height: -1 })
      .exec();

    response.send(blocks);
  };

  show = async (request: Request, response: Response): Promise<void> => {
    const apiKeyVerificationResult = await this.authUtils.verifyApiKey(request, response);

    if (!apiKeyVerificationResult.apiKey) {
      return;
    }

    StatsDClient?.increment('sanctuary.blocks-controller.show', undefined, {
      projectId: apiKeyVerificationResult.apiKey.projectId,
    });

    const block = await Block.findById(request.params.id);
    response.send({ data: block });
  };

  leaves = async (request: Request, response: Response): Promise<void> => {
    const apiKeyVerificationResult = await this.authUtils.verifyApiKey(request, response);

    if (!apiKeyVerificationResult.apiKey) {
      return;
    }

    StatsDClient?.increment('sanctuary.blocks-controller.leaves', undefined, {
      projectId: apiKeyVerificationResult.apiKey.projectId,
    });

    const leaves = await Leaf.find({ blockId: request.params.id });
    response.send(leaves);
  };
}

export default BlocksController;
