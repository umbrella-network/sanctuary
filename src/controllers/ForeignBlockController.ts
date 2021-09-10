import { inject, injectable, postConstruct } from 'inversify';
import StatsdClient from 'statsd-client';
import { Request, Response, Router } from 'express';
import { AuthenticationMiddleware } from '../middleware/AuthenticationMiddleware';
import ForeignBlock from '../models/ForeignBlock';
import { ReplicatedBlockLoader } from '../services/ReplicatedBlockLoader';

@injectable()
export class ForeignBlockController {
  @inject('StatsdClient')
  private statsdClient?: StatsdClient;

  @inject(AuthenticationMiddleware)
  private authenticationMiddleware: AuthenticationMiddleware;

  @inject(ReplicatedBlockLoader)
  private loader: ReplicatedBlockLoader;

  router: Router;

  @postConstruct()
  setup(): void {
    this.router = Router()
      .use(this.authenticationMiddleware.apply)
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
    const limit = Math.min(parseInt(<string> request.query.limit || '100'), 100);
    const blocks = await this.loader.find({ foreignChainId, offset, limit });
    response.send(blocks);
  }

  show = async (request: Request, response: Response): Promise<void> => {
    this.statsdClient?.increment(
      'sanctuary.foreign-blocks-controller.show',
      1,
      { projectId: request.params.currentProjectId }
    );

    const foreignChainId = <string> request.params.foreignChainId;
    const blockId = parseInt(<string> request.params.blockId);
    const block = await ForeignBlock.findOne({ foreignChainId, blockId }).exec();

    if (block) {
      response.send({ data: block });
    } else {
      response.status(404);
    }
  }
}
