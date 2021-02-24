import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import Project from '../models/Project';
import { AuthUtils } from '../services/AuthUtils';

interface ICreateProjectReqBody {
  name?: string;
}

@injectable()
class ProjectsController {
  router: express.Router;

  constructor(@inject(AuthUtils) private readonly authUtils: AuthUtils) {
    this.router = express.Router().post('/', this.create).get('/', this.index).delete('/:id', this.delete);
  }

  create = async (request: Request<unknown, unknown, ICreateProjectReqBody>, response: Response): Promise<void> => {
    const tokenResult = this.authUtils.getAuthorizationToken(request.headers.authorization);

    if (!tokenResult.token) {
      response.status(403).send({ error: tokenResult.errorMessage });
      return;
    }

    const { name } = request.body;

    if (!name) {
      response.status(400).send({ error: 'No name for the project was provided' });
      return;
    }

    const project = await Project.create({
      _id: new mongoose.Types.ObjectId().toHexString(),
      name,
      ownerId: tokenResult.token.userId,
      ownerType: 'User',
    });

    response.status(201).send(project);
  };

  index = async (request: Request, response: Response): Promise<void> => {
    const tokenResult = this.authUtils.getAuthorizationToken(request.headers.authorization);

    if (!tokenResult.token) {
      response.status(403).send({ error: tokenResult.errorMessage });
      return;
    }

    const projects = await Project.find({ ownerId: tokenResult.token.userId });

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
    const tokenResult = this.authUtils.getAuthorizationToken(request.headers.authorization);

    if (!tokenResult.token) {
      response.status(403).send({ error: tokenResult.errorMessage });
      return;
    }

    const projectId = request.params.id;
    if (!projectId) {
      response.status(400).send({ error: 'No project ID was specified' });
      return;
    }

    const project = await Project.findOne({ _id: projectId, ownerId: tokenResult.token.userId });
    if (!projectId || !project) {
      response.status(404).send({ error: 'Project with provided ID not found' });
      return;
    }

    await project.remove();
    response.send();
  };
}

export default ProjectsController;
