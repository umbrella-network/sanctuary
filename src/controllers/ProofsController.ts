import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import Block from '../models/Block';
import Leaf from '../models/Leaf';
import { AuthUtils } from '../services/AuthUtils';
import { BlockStatus } from '../types/blocks';
import StatsDClient from '../lib/StatsDClient';

@injectable()
class ProofsController {
  router: express.Router;

  constructor(@inject(AuthUtils) private readonly authUtils: AuthUtils) {
    this.router = express.Router().get('/', this.index);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    const apiKeyVerificationResult = await this.authUtils.verifyApiKey(request, response);

    if (!apiKeyVerificationResult.apiKey) {
      return;
    }

    StatsDClient?.increment('sanctuary.proofs-controller.index', undefined, {
      projectId: apiKeyVerificationResult.apiKey.projectId,
    });

    const block = await Block.findOne({ status: BlockStatus.Finalized }).sort({ blockId: -1 }).limit(1);

    if (block) {
      const keys = (request.query.keys || []) as string[];
      const leaves = await Leaf.find({ blockId: block.blockId, key: { $in: keys } });
      response.send({ data: { block, keys, leaves } });
    } else {
      response.send({ data: {} });
    }
  };
}

export default ProofsController;
