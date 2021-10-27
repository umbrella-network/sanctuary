import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../models/LocalUser';
import Company from '../models/Company';
import Project from '../models/Project';
import { ProjectAuthUtils } from '../services/ProjectAuthUtils';

@injectable()
class UsersController {
  router: express.Application;

  constructor(@inject(ProjectAuthUtils) private readonly authUtils: ProjectAuthUtils) {
    this.router = express().post('/', this.create).get('/', this.find);
  }

  create = async (request: Request, response: Response): Promise<void> => {
    const { email, password } = request.body;

    if (password.length < 8) {
      response.status(422).send();
      return;
    }

    bcrypt.hash(password, 10, (err, hashed) => {
      if (err) {
        return response.status(422).send();
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

  find = async (request: Request, response: Response): Promise<void> => {
    const tokenResult = this.authUtils.getAuthorizationToken(request.headers.authorization);
    if (!tokenResult.token) {
      response.status(403).send({ error: tokenResult.errorMessage });
      return;
    }

    const user = await User.findById(tokenResult.token.userId);
    const projects = await Project.find({ userId: user.id });
    const companies = await Company.find({ userId: user.id });
    response.send({
      user: {
        id: user.id,
        email: user.email,
        verified: user.verified,
        projects: projects.map((project) => {
          return {
            id: project.id,
            name: project.name,
          };
        }),
        companies: companies.map((company) => {
          return {
            id: company.id,
            name: company.name,
          };
        }),
      },
    });
  };
}

export default UsersController;
