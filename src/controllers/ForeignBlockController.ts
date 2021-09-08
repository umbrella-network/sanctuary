import { inject, injectable, postConstruct } from 'inversify';
import StatsdClient from 'statsd-client';
import { Request, Response, Router } from 'express';
import { AuthenticationMiddleware } from '../middleware/AuthenticationMiddleware';
import ForeignBlock from '../models/ForeignBlock';

@injectable()
export class ForeignBlockController {
  @inject('StatsdClient')
  private statsdClient?: StatsdClient;

  @inject(AuthenticationMiddleware)
  private authenticationMiddleware: AuthenticationMiddleware;

  router: Router;

  @postConstruct()
  setup(): void {
    this.router = Router()
      // .use(this.authenticationMiddleware.apply)
      .get('/', this.index)
      .get('/:foreignChainId/:blockId', this.show);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    await this.statsdClient?.increment(
      'sanctuary.foreign-blocks-controller.index',
      1,
      { projectId: request.params.currentProjectId }
    );

    const foreignChainId = <string> request.query.foreignChainId;
    const offset = parseInt(<string> request.query.offset || '0');
    const limit = parseInt(<string> request.query.limit || '100');
    const conditions = foreignChainId ? { foreignChainId } : {};

    const blocks = await ForeignBlock
      .find(conditions)
      .skip(offset)
      .limit(limit)
      .sort({ blockId: -1 })
      .exec();

    // consider changing to { data: blocks }
    response.send(blocks);
  }

  show = async (request: Request, response: Response): Promise<void> => {
    await this.statsdClient?.increment(
      'sanctuary.foreign-blocks-controller.show',
      1,
      { projectId: request.params.currentProjectId }
    );

    const foreignChainId = <string> request.query.foreignChainId;
    const blockId = parseInt(<string> request.query.blockId);
    const block = await ForeignBlock.findOne({ foreignChainId, blockId }).exec();

    if (block) {
      response.send({ data: block });
    } else {
      response.status(404);
    }
  }
}
