import { expect } from 'chai';
import { foreignBlockFactory } from '../../mocks/factories/foreignBlockFactory';
import ForeignBlock, { IForeignBlock } from '../../../src/models/ForeignBlock';
import { loadTestEnv } from '../../helpers';
import mongoose from 'mongoose';
import axios, { AxiosResponse } from 'axios';

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
    let subject: AxiosResponse<any>;

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
      subject = await operation();
      const data = subject.data;

      expect(data).to.be.an('array').with.length(3);

      for (const block of data) {
        const matchingForeignBlock = foreignBlocks.find((e) => e._id == block._id);
        expect(matchingForeignBlock).to.exist;
        expect(block.blockId).to.eq(matchingForeignBlock.blockId);
        expect(block.foreignChainId).to.eq(matchingForeignBlock.foreignChainId);
        expect(block.anchor).to.eq(matchingForeignBlock.anchor);
      }
    });
  });
});
