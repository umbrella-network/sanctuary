import { injectable } from 'inversify';
import express, { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Project from '../models/Project';
import { getAuthorizationToken } from '../lib/auth';

interface ICreateProjectReqBody {
  name?: string;
}

@injectable()
class ProjectsController {
  router: express.Router;

  constructor() {
    this.router = express.Router().post('/', this.create).get('/', this.index).delete('/:id', this.delete);
  }

  create = async (request: Request<unknown, unknown, ICreateProjectReqBody>, response: Response): Promise<void> => {
    const auth = getAuthorizationToken(request.headers.authorization);

    if (!auth) {
      response.status(403).send();
      return;
    }

    const { name } = request.body;

    if (!name) {
      response.status(400).send();
      return;
    }

    const project = await Project.create({
      _id: new mongoose.Types.ObjectId().toHexString(),
      name,
      ownerId: auth.userId,
      ownerType: 'User',
    });

    response.status(201).send(project);
  };

  index = async (request: Request, response: Response): Promise<void> => {
    const auth = getAuthorizationToken(request.headers.authorization);

    if (!auth) {
      response.status(403).send();
      return;
    }

    const projects = await Project.find({ ownerId: auth.userId });

    response.send({
      projects: projects.map((project) => {
        return {
          id: project.id,
          name: project.name,
        };
      }),
    });
  };

  delete = async (request: Request<{ id: string }>, response: Response): Promise<void> => {
    const auth = getAuthorizationToken(request.headers.authorization);

    if (!auth) {
      response.status(403).send();
      return;
    }

    const projectId = request.params.id;
    if (!projectId) {
      response.status(400).send();
      return;
    }

    const project = await Project.findById(projectId);
    if (!projectId || !project) {
      response.status(404).send();
      return;
    }

    await project.remove();
    response.send();
  };
}

export default ProjectsController;
