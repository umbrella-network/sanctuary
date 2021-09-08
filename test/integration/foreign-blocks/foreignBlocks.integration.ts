import { expect } from 'chai';
import { foreignBlockFactory } from '../../mocks/factories/foreignBlockFactory';
import ForeignBlock, { IForeignBlock } from '../../../src/models/ForeignBlock';
import { loadTestEnv } from '../../helpers';
import mongoose from 'mongoose';
import axios from 'axios';

describe('/foreign-blocks', async () => {
  const config = loadTestEnv();

  before(async () => {
    await mongoose.connect(config.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  after(async () => {
    await mongoose.connection.close();
  });

  describe('GET /', async () => {
    const http = axios.create({ baseURL: config.APP_URL });
    const operation = async () => http.get('/foreign-blocks');

    let foreignBlocks: IForeignBlock[];
    let subject: any;

    before(async () => {
      await ForeignBlock.deleteMany({});
      foreignBlocks = [];

      for (let i = 0; i < 3; i++) {
        const foreignBlock = new ForeignBlock(foreignBlockFactory.build());
        await foreignBlock.save();
        foreignBlocks.push(foreignBlock);
      }
    });

    after(async () => {
      await ForeignBlock.deleteMany({});
    });

    it('returns foreign blocks', async () => {
      const subject = await operation();
      console.log(subject);
    });
  });
});
