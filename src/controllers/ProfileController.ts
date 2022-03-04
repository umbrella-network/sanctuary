import { inject, injectable, postConstruct } from 'inversify';
import { NextFunction, Request, Response, Router } from 'express';
import { ProtectedMiddleware } from '../middleware/ProtectedMiddleware';
import { UserNotFoundError, UserRepository, UserUpdateError } from '../repositories/UserRepository';
import { MetricsMiddleware } from '../middleware/MetricsMiddleware';
import { Logger } from 'winston';

@injectable()
export class ProfileController {
  @inject('Logger')
  private logger!: Logger;

  @inject(ProtectedMiddleware)
  private protectedMiddleware!: ProtectedMiddleware;

  @inject(MetricsMiddleware)
  private metricsMiddleware!: MetricsMiddleware;

  @inject(UserRepository)
  private userRepository!: UserRepository;

  router: Router;

  @postConstruct()
  setup(): void {
    this.router = Router();

    this.router
      .use(this.protectedMiddleware.apply)
      .get('/', this.show)
      .put('/', this.update)
      .patch('/', this.update)
      .use(this.metricsMiddleware.apply);
  }

  show = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.metrics = { metric: 'sanctuary.profile-controller.show' };

    try {
      const user = await this.userRepository.find({ id: req.user.sub });
      res.send({ data: user }); // TODO: check if we need to filter fields
    } catch (e) {
      if (!(e instanceof UserNotFoundError)) return next(e);

      this.logger.error('User Profile not Found.', e);
      res.status(404).send();
    }

    next();
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.metrics = { metric: 'sanctuary.profile-controller.update' };

    try {
      const id = req.user.sub;
      const data = req.body.data;
      const user = await this.userRepository.update({ id, data });
      res.send({ data: user });
    } catch (e) {
      if (!(e instanceof UserUpdateError)) return next(e);

      this.logger.error('User Update failed.', e);
      res.status(422).send();
    }

    next();
  };
}
