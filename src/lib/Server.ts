import { inject, injectable } from 'inversify';
import express from 'express';
import http from 'http';
import helmet from 'helmet';
import compression from 'compression';
import logger from './logger';
import cors from 'cors';
import HealthController from '../controllers/HealthController';
import BlocksController from '../controllers/BlocksController';
import ProofsController from '../controllers/ProofsController';
import AuthController from '../controllers/AuthController';
import UsersController from '../controllers/UsersController';
import Settings from '../types/Settings';
import ApiKeysController from '../controllers/ApiKeysController';
import ProjectsController from '../controllers/ProjectsController';
import WalletAuthController from '../controllers/WalletAuthController';

@injectable()
class Server {
  private port: number;
  private router: express.Application;
  private server: http.Server;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(HealthController) healthController: HealthController,
    @inject(BlocksController) blocksController: BlocksController,
    @inject(ProofsController) proofsController: ProofsController,
    @inject(AuthController) authController: AuthController,
    @inject(UsersController) usersController: UsersController,
    @inject(ApiKeysController) apiKeyController: ApiKeysController,
    @inject(ProjectsController) projectsController: ProjectsController,
    @inject(WalletAuthController) walletAuthController: WalletAuthController
  ) {
    this.port = settings.port;

    this.router = express()
      .use(helmet())
      .use(compression())
      .use(express.json())
      .use(express.urlencoded({ extended: true }))
      .use(cors())
      .use('/health', healthController.router)
      .use('/blocks', blocksController.router)
      .use('/proofs', proofsController.router)
      .use('/users', usersController.router)
      .use('/auth', authController.router)
      .use('/api-keys', apiKeyController.router)
      .use('/projects', projectsController.router)
      .use('/wallet-auth', walletAuthController.router)
      .options('*', cors());

    this.server = http.createServer(this.router);
  }

  start(): void {
    this.server.listen(this.port, () => logger.info('Live on: ' + this.port));
  }
}

export default Server;
