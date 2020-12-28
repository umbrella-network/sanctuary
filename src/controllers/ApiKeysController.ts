import { injectable } from 'inversify';
import express, { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Project from '../models/Project';
import ApiKey from '../models/ApiKey';
import cryptoRandomString from 'crypto-random-string';

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

  constructor() {
    this.router = express
      .Router()
      .post('/', this.create)
      .get('/', this.index)
      .delete('/:id', this.delete)
      .patch('/:id', this.patch);
  }

  create = async (request: Request<unknown, unknown, ICreateApiKeyReqBody>, response: Response): Promise<void> => {
    const auth = getAuthorizationToken(request.headers.authorization);

    if (!auth) {
      response.status(403).send();
      return;
    }

    const { projectId, description, expiresAt } = request.body;

    if (!projectId) {
      response.status(400).send();
      return;
    }

    const project = await Project.findOne({ _id: projectId, ownerId: auth.userId });

    if (!project) {
      response.status(404).send();
      return;
    }

    const apiKey = await ApiKey.create({
      _id: new mongoose.Types.ObjectId().toHexString(),
      key: await cryptoRandomString.async({ length: 64 }),
      description,
      projectId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    response.send(apiKey.toJSON());
  };

  index = async (request: Request, response: Response): Promise<void> => {
    const auth = getAuthorizationToken(request.headers.authorization);

    if (!auth) {
      response.status(403).send();
      return;
    }

    const projectIdFilter = request.query.projectId;

    const projectsProjectedByIds = projectIdFilter
      ? await Project.find({ _id: projectIdFilter, ownerId: auth.userId }, { _id: true })
      : await Project.find({ ownerId: auth.userId }, { _id: true });

    const projectIds: string[] = projectsProjectedByIds.map((project) => project._id);

    const apiKeys = await ApiKey.find({ projectId: { $in: projectIds } });

    response.send(apiKeys);
  };

  delete = async (request: Request<{ id: string }>, response: Response): Promise<void> => {
    const auth = getAuthorizationToken(request.headers.authorization);

    if (!auth) {
      response.status(403).send();
      return;
    }

    const apiKeyId = request.params.id;
    if (!apiKeyId) {
      response.status(400).send();
      return;
    }

    const apiKey = await ApiKey.findById(apiKeyId);
    if (!apiKey) {
      response.status(404).send();
      return;
    }

    // Check if the current user is the owner of project
    const project = await Project.findOne({ _id: apiKey.projectId, ownerId: auth.userId });
    if (!project) {
      response.status(403).send();
    }

    await apiKey.remove();
    response.send();
  };

  patch = async (request: Request<{ id: string }, unknown, IEditApiKeyReqBody>, response: Response): Promise<void> => {
    const auth = getAuthorizationToken(request.headers.authorization);

    if (!auth) {
      response.status(403).send();
      return;
    }

    const apiKeyId = request.params.id;
    if (!apiKeyId) {
      response.status(400).send();
      return;
    }

    const apiKey = await ApiKey.findById(apiKeyId);
    if (!apiKey) {
      response.status(404).send();
      return;
    }

    // Check if the current user is the owner of project
    const project = await Project.findOne({ _id: apiKey.projectId, ownerId: auth.userId });
    if (!project) {
      response.status(403).send();
    }

    const { description, expiresAt } = request.body;

    apiKey.description = description || apiKey.description;
    apiKey.expiresAt = expiresAt ? new Date(expiresAt) : apiKey.expiresAt;
    await apiKey.save();
    response.send(apiKey.toJSON());
  };
}

export default ApiKeysController;

function getAuthorizationToken(authorizationHeader: string): Record<string, unknown> | undefined {
  const token = authorizationHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.AUTH_PRIVATE_KEY);
    return decoded as Record<string, unknown>;
  } catch {
    return;
  }
}
