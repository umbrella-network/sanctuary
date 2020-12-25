import { injectable } from 'inversify';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../models/User';

@injectable()
class UsersController {
  router: express.Application;

  constructor() {
    this.router = express().post('/', this.create);
  }

  create = async (request: Request, response: Response): Promise<void> => {
    const { email, password } = request.body;

    bcrypt.hash(password, 10, (err, hashed) => {
      if (err) {
        return response.send(422).send();
      }

      const id = new mongoose.Types.ObjectId().toHexString();
      const user = new User({ _id: id, email, password: hashed });
      const errors = user.validateSync();

      if (errors) {
        return response.status(422).send(errors);
      }

      user.save((errors, user) => {
        if (errors) {
          return response.status(422).send({ errors });
        }

        return response.status(201).send({
          user: {
            id: user.id,
            email: user.email,
            verified: false, // can't be verified when initially created
          },
        });
      });
    });
  };
}

export default UsersController;
