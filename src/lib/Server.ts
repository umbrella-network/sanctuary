import 'express-async-errors';
import { inject, injectable } from 'inversify';
import express, { ErrorRequestHandler } from 'express';
import http from 'http';
import helmet from 'helmet';
import compression from 'compression';
import logger from './logger';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import HealthController from '../controllers/HealthController';
import { BlocksController } from '../controllers/BlocksController';
import ProofsController from '../controllers/ProofsController';
import UsageMetricsController from '../controllers/UsageMetricsController';
import MetricsController from '../controllers/MetricsController';
import Settings from '../types/Settings';
import ApiKeysController from '../controllers/ApiKeysController';
import ProjectsController from '../controllers/ProjectsController';
import InfoController from '../controllers/InfoController';
import FcdsController from '../controllers/FcdsController';
import KeysController from '../controllers/KeysController';
import { ProfileController } from '../controllers/ProfileController';
import { Logger } from 'winston';

import swaggerDocument from '../config/swagger.json';
import internalSwaggerDocument from '../config/swagger-internal.json';

@injectable()
class Server {
  app: express.Application;
  private logger: Logger;
  private port: number;
  private server: http.Server;

  constructor(
    @inject('Settings') settings: Settings,
    @inject('Logger') logger: Logger,
    @inject(HealthController) healthController: HealthController,
    @inject(BlocksController) blocksController: BlocksController,
    @inject(FcdsController) fcdsController: FcdsController,
    @inject(KeysController) keysController: KeysController,
    @inject(ProofsController) proofsController: ProofsController,
    @inject(UsageMetricsController) usageMetricsController: UsageMetricsController,
    @inject(MetricsController) metricsController: MetricsController,
    @inject(ApiKeysController) apiKeyController: ApiKeysController,
    @inject(ProjectsController) projectsController: ProjectsController,
    @inject(InfoController) infoController: InfoController,
    @inject(ProfileController) profileController: ProfileController
  ) {
    this.port = settings.port;
    this.logger = logger;

    this.app = express()
      .use(helmet())
      .use(compression())
      .use(express.json())
      .use(express.urlencoded({ extended: true }))
      .use(cors())
      .use('/health', healthController.router)
      .use('/docs', swaggerUi.serveFiles(swaggerDocument), swaggerUi.setup(swaggerDocument))
      .use('/docs-internal', swaggerUi.serveFiles(internalSwaggerDocument), swaggerUi.setup(internalSwaggerDocument))
      .use('/blocks', blocksController.router)
      .use('/fcds', fcdsController.router)
      .use('/keys', keysController.router)
      .use('/proofs', proofsController.router)
      .use('/usage-metrics', usageMetricsController.router)
      .use('/metrics', metricsController.router)
      .use('/api-keys', apiKeyController.router)
      .use('/projects', projectsController.router)
      .use('/info', infoController.router)
      .use('/profile', profileController.router)
      .use(this.authErrorHandler)
      .use(this.generalErrorHandler);

    this.server = http.createServer(this.app);
  }

  authErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
    if (err.name != 'UnauthorizedError') return next(err);

    this.logger.error('Authorization Error');
    res.status(401).end();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  generalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
    this.logger.error('Application Error', err);
    res.status(500).end();
  };

  start(): void {
    this.server.listen(this.port, () => logger.info('Live on: ' + this.port));
  }
}

export default Server;
