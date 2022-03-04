import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import Project from '../models/Project';
import { ProtectedMiddleware } from '../middleware/ProtectedMiddleware';
import { translateAuth0UserId } from '../lib/translateAuth0UserId';

interface ICreateProjectReqBody {
  name?: string;
}

@injectable()
class ProjectsController {
  router: express.Router;

  constructor(@inject(ProtectedMiddleware) protectedMiddleware: ProtectedMiddleware) {
    this.router = express
      .Router()
      .use(protectedMiddleware.apply)
      .post('/', this.create)
      .get('/', this.index)
      .delete('/:id', this.delete);
  }

  create = async (request: Request<unknown, unknown, ICreateProjectReqBody>, response: Response): Promise<void> => {
    const { name } = request.body;

    if (!name) {
      response.status(400).send({ error: 'No name for the project was provided' });
      return;
    }

    const project = await Project.create({
      _id: new mongoose.Types.ObjectId().toHexString(),
      name,
      ownerId: translateAuth0UserId(request.user.sub),
      ownerType: 'User',
    });

    response.status(201).send(project);
  };

  index = async (request: Request, response: Response): Promise<void> => {
    const projects = await Project.find({ ownerId: translateAuth0UserId(request.user.sub) });

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
    const projectId = request.params.id;
    if (!projectId) {
      response.status(400).send({ error: 'No project ID was specified' });
      return;
    }

    const project = await Project.findOne({ _id: projectId, ownerId: translateAuth0UserId(request.user.sub) });
    if (!projectId || !project) {
      response.status(404).send({ error: 'Project with provided ID not found' });
      return;
    }

    await project.deleteOne();
    response.send();
  };
}

export default ProjectsController;
