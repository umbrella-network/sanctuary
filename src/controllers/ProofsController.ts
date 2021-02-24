import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import Block from '../models/Block';
import Leaf from '../models/Leaf';
import { AuthUtils } from '../services/AuthUtils';

@injectable()
class ProofsController {
  router: express.Router;

  constructor(@inject(AuthUtils) private readonly authUtils: AuthUtils) {
    this.router = express.Router().get('/', this.index);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    const apiKeyVerificationResult = await this.authUtils.verifyApiKeyFromAuthHeader(request.headers.authorization);

    if (!apiKeyVerificationResult.apiKey) {
      response.status(401).send({ error: apiKeyVerificationResult.errorMessage });
      return;
    }

    const block = await Block.findOne({ status: 'finalized' }).sort({ height: -1 }).limit(1);

    if (block) {
      const keys = request.query.keys as string[];
      const leaves = await Leaf.find({ blockId: block.id, key: { $in: keys } });
      response.send({ data: { block: block, keys: keys, leaves: leaves } });
    } else {
      response.send({ data: {} });
    }
  };
}

export default ProofsController;
