import { injectable } from 'inversify';
import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { sign } from 'jsonwebtoken';
import User from '../models/User';

@injectable()
class AuthController {
  router: express.Application;

  constructor() {
    this.router = 
      express()
        .post('/', this.create);
  }

  create = async (request: Request, response: Response): Promise<void> => {
    const {email, password} = request.body;

    if (!email || !password) {
      response.status(422).send();
      return;
    }

    const user = await User.findOne({email});

    if (!user) {
      response.status(403).send();
      return;
    }

    const matchPassword = await bcrypt.compare(password, user.password);

    if (!matchPassword) {
      response.status(403).send();
      return;
    }

    // 1 week expiry
    const exp = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7);
    const privateKey = process.env.AUTH_PRIVATE_KEY;
    const token = sign({exp, userId: user.id}, privateKey);
    response.status(201).send({token});
  }
}

export default AuthController;
