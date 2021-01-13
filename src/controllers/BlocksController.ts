import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import Block from '../models/Block';
import Leaf from '../models/Leaf';
import { AuthUtils } from '../services/AuthUtils';

@injectable()
class BlocksController {
  router: express.Application;

  constructor(@inject(AuthUtils) private readonly authUtils: AuthUtils) {
    this.router = express().get('/', this.index).get('/:id', this.show).get('/:id/leaves', this.leaves);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    const apiKeyVerificationResult = await this.authUtils.verifyApiKeyFromAuthHeader(request.headers.authorization);

    if (!apiKeyVerificationResult.apiKey) {
      response.status(401).send({ error: apiKeyVerificationResult.errorMessage });
      return;
    }

    const offset: number = parseInt(<string>request.query.offset) || 0;
    const limit: number = parseInt(<string>request.query.limit) || 100;

    const blocks = await Block.find({ status: 'finalized' }).skip(offset).limit(limit).sort({ height: -1 }).exec();

    response.send(blocks);
  };

  show = async (request: Request, response: Response): Promise<void> => {
    const apiKeyVerificationResult = await this.authUtils.verifyApiKeyFromAuthHeader(request.headers.authorization);

    if (!apiKeyVerificationResult.apiKey) {
      response.status(401).send({ error: apiKeyVerificationResult.errorMessage });
      return;
    }

    const block = await Block.findById(request.params.id);
    response.send({ data: block });
  };

  leaves = async (request: Request, response: Response): Promise<void> => {
    const apiKeyVerificationResult = await this.authUtils.verifyApiKeyFromAuthHeader(request.headers.authorization);

    if (!apiKeyVerificationResult.apiKey) {
      response.status(401).send({ error: apiKeyVerificationResult.errorMessage });
      return;
    }

    const leaves = await Leaf.find({ blockId: request.params.id });
    response.send(leaves);
  };
}

export default BlocksController;
