import { injectable } from 'inversify';
import express, { Request, Response } from 'express';
import { ethers } from 'ethers';
import cryptoRandomString from 'crypto-random-string';
import WalletAuth from '../models/WalletAuth';
import { add } from 'winston';

@injectable()
class WalletAuthController {
  router: express.Router;

  constructor() {
    this.router = express.Router().post('/', this.create).post('/verify', this.verify);
  }

  create = async (request: Request, response: Response): Promise<void> => {
    const message = await cryptoRandomString.async({ length: 32 });
    // Should we ensure the random string doesn't exist in DB?
    response.send({
      message,
    });
  };

  verify = async (request: Request, response: Response): Promise<void> => {
    const { message, signature } = request.body;
    const walletAuth = await WalletAuth.findOne({ message });

    if (!walletAuth) {
      response.status(400).send({ error: 'Could not find message to verify signature.' });
      return;
    }

    try {
      const address = await ethers.utils.verifyMessage(message, signature);
      walletAuth.address = address;
      walletAuth.verified = true;
      await walletAuth.save();
      response.send({ address });
    } catch (error) {
      response.status(400).send({ error: 'Could not verify message and signature.' });
    }
  };
}

export default WalletAuthController;
