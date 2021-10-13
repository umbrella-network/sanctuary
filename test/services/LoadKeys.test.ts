import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { loadFeeds } from '@umb-network/toolbox';

chai.use(chaiAsPromised);

describe('Load Layer 2 Data keys', () => {
  describe('when loading l2d from local file', () => {
    it('returns an array of keys', async () => {
      const keys = [...Object.keys(await loadFeeds('test/fixtures/feeds-example.yaml'))];
      expect(keys).to.be.an('array').and.to.have.length(4);
    });
  });

  describe('when failing to load l2d', () => {
    it('returns an error', () => {
      return expect(loadFeeds('test/fixtures/non-existent-feeds-example.yaml')).to.be.eventually.rejected;
    });
  });
});
