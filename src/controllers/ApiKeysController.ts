import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import Project from '../models/Project';
import ApiKey from '../models/ApiKey';
import cryptoRandomString from 'crypto-random-string';
import { AuthenticationMiddleware } from '../middleware/AuthenticationMiddleware';
import { translateAuth0UserId } from '../lib/translateAuth0UserId';

interface ICreateApiKeyReqBody {
  projectId?: string;
  description?: string;

  /**
   * Optional. API key expiration time in ISO 8601 format
   */
  expiresAt?: string;
}

interface IEditApiKeyReqBody {
  description?: string;
  expiresAt?: string;
}

@injectable()
class ApiKeysController {
  router: express.Router;

  constructor(@inject(AuthenticationMiddleware) authenticationMiddleware: AuthenticationMiddleware) {
    this.router = express
      .Router()
      .use(authenticationMiddleware.apply)
      .post('/', this.create)
      .get('/', this.index)
      .delete('/:id', this.delete)
      .patch('/:id', this.patch);
  }

  create = async (request: Request<unknown, unknown, ICreateApiKeyReqBody>, response: Response): Promise<void> => {
    const { projectId, description, expiresAt } = request.body;

    if (!projectId) {
      response.status(400).send({ error: 'No project ID was provided' });
      return;
    }

    const project = await Project.findOne({ _id: projectId, ownerId: translateAuth0UserId(request.user.sub) });

    if (!project) {
      response.status(404).send({ error: 'Project with provided ID not found' });
      return;
    }

    const apiKey = await ApiKey.create({
      _id: new mongoose.Types.ObjectId().toHexString(),
      key: await cryptoRandomString.async({ length: 64 }),
      description,
      projectId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    response.status(201).send(apiKey);
  };

  index = async (request: Request, response: Response): Promise<void> => {
    const projectIdFilter = request.query.projectId;

    const projectsProjectedByIds = projectIdFilter
      ? await Project.find({ _id: projectIdFilter, ownerId: translateAuth0UserId(request.user.sub) }, { _id: true })
      : await Project.find({ ownerId: translateAuth0UserId(request.user.sub) }, { _id: true });

    const projectIds: string[] = projectsProjectedByIds.map((project) => project._id);

    const apiKeys = await ApiKey.find({ projectId: { $in: projectIds } });

    response.send(apiKeys);
  };

  delete = async (request: Request<{ id: string }>, response: Response): Promise<void> => {
    const apiKeyId = request.params.id;

    if (!apiKeyId) {
      response.status(400).send({ error: 'No API key`s ID was provided' });
      return;
    }

    const apiKey = await ApiKey.findById(apiKeyId);
    if (!apiKey) {
      response.status(404).send({ error: 'API key with provided ID not found' });
      return;
    }

    // Check if the current user is the owner of project
    const project = await Project.findOne({ _id: apiKey.projectId, ownerId: translateAuth0UserId(request.user.sub) });
    if (!project) {
      response.status(403).send({ error: 'You do not own this project' });
      return;
    }

    await apiKey.deleteOne();
    response.send();
  };

  patch = async (request: Request<{ id: string }, unknown, IEditApiKeyReqBody>, response: Response): Promise<void> => {
    const apiKeyId = request.params.id;

    if (!apiKeyId) {
      response.status(400).send({ error: 'No API key`s ID was provided' });
      return;
    }

    const apiKey = await ApiKey.findById(apiKeyId);
    if (!apiKey) {
      response.status(404).send({ error: 'API key with provided ID not found' });
      return;
    }

    // Check if the current user is the owner of project
    const project = await Project.findOne({ _id: apiKey.projectId, ownerId: translateAuth0UserId(request.user.sub) });
    if (!project) {
      response.status(403).send({ error: 'You do not own this project' });
      return;
    }

    const { description, expiresAt } = request.body;

    apiKey.description = description || apiKey.description;
    apiKey.expiresAt = expiresAt ? new Date(expiresAt) : apiKey.expiresAt;
    await apiKey.save();
    response.send(apiKey);
  };
}

export default ApiKeysController;
