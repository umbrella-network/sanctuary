import { inject, injectable } from 'inversify';
import express, { Request, Response } from 'express';
import { ethers } from 'ethers';
import { sign } from 'jsonwebtoken';
import Settings from '../types/Settings';

@injectable()
class WalletAuthController {
  router: express.Router;
  settings: Settings;

  constructor(@inject('Settings') settings: Settings) {
    this.router = express.Router().post('/verify', this.verify);
    this.settings = settings;
  }

  verify = async (request: Request, response: Response): Promise<void> => {
    const { verifiedTime, signature } = request.body;

    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > verifiedTime + 30) {
      response.status(400).send({ error: 'Signed timestamp has expired (30 second timeout).' });
      return;
    }

    try {
      const address = await ethers.utils.verifyMessage(verifiedTime, signature);
      const tokenPrivateKey = process.env.AUTH_PRIVATE_KEY;
      const exp = Math.floor(Date.now() / 1000) + this.settings.auth.tokenExpiry;
      const token = sign({ exp, userId: address }, tokenPrivateKey);
      response.status(201).send({ token });
    } catch (error) {
      response.status(400).send({ error: 'Could not verify message and signature.' });
    }
  };
}

export default WalletAuthController;
