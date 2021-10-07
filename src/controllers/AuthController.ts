import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { sign } from 'jsonwebtoken';
import User from '../models/User';
import Settings from '../types/Settings';
import { TimeService } from '../services/TimeService';

@injectable()
class AuthController {
  router: express.Application;
  settings: Settings;

  constructor(@inject('Settings') settings: Settings) {
    this.router = express().post('/', this.create);
    this.settings = settings;
  }

  create = async (request: Request, response: Response): Promise<void> => {
    const { email, password } = request.body;

    if (!email || !password) {
      response.status(422).send();
      return;
    }

    const user = await User.findOne({ email });

    if (!user) {
      response.status(403).send();
      return;
    }

    const matchPassword = await bcrypt.compare(password, user.password);

    if (!matchPassword) {
      response.status(403).send();
      return;
    }

    const exp = TimeService.now() + this.settings.auth.tokenExpiry;
    const privateKey = process.env.AUTH_PRIVATE_KEY;
    const token = sign({ exp, userId: user.id }, privateKey);
    response.status(201).send({ token });
  };
}

export default AuthController;
