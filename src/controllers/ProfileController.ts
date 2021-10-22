import { inject, injectable, postConstruct } from 'inversify';
import { Request, Response, Router } from 'express';
import { AuthenticationMiddleware } from '../middleware/AuthenticationMiddleware';
import { UserNotFoundError, UserRepository, UserUpdateError } from '../repositories/UserRepository';
import { MetricsMiddleware } from '../middleware/MetricsMiddleware';

@injectable()
export class ProfileController {
  @inject(AuthenticationMiddleware)
  private authenticationMiddleware!: AuthenticationMiddleware;

  @inject(MetricsMiddleware)
  private metricsMiddleware!: MetricsMiddleware;

  @inject(UserRepository)
  private userRepository!: UserRepository;

  router: Router;

  @postConstruct()
  setup(): void {
    this.router = Router();
    this.router.use(this.authenticationMiddleware.apply).get('/', this.show).use(this.metricsMiddleware.apply);
  }

  show = async (req: Request, res: Response): Promise<void> => {
    console.log('==================');
    console.log(req);
    console.log('==================');
    res.metrics = { metric: 'sanctuary.profile-controller.show' };

    try {
      const user = await this.userRepository.find({ id: req.user.sub });
      res.send({ data: user }); // TODO: check if we need to filter fields
    } catch (e) {
      if (!(e instanceof UserNotFoundError)) throw e;

      res.status(404).send();
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    res.metrics = { metric: 'sanctuary.profile-controller.update' };

    try {
      const update = req.body;

      const user = await this.userRepository.update({
        sub: req.user.sub,
        update,
      });

      res.send({ data: user });
    } catch (e) {
      if (!(e instanceof UserUpdateError)) throw e;

      res.status(422).send();
    }
  };
}
