import chai, { expect } from 'chai';
import settings from '../../src/config/settings';
import loadL2DKeys from '../../src/services/LoadL2DKeys';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

describe('Load Layer 2 Data keys', () => {
  describe('when loading l2d from local file', () => {
    beforeEach(() => (settings.feedsFile = 'test/fixtures/feeds-example.yaml'));

    it('returns an array of keys', () => {
      return expect(loadL2DKeys()).to.eventually.be.an('array').and.to.have.length(4);
    });
  });

  describe('when failing to load l2d', () => {
    beforeEach(() => (settings.feedsFile = 'test/fixtures/non-existent-feeds-example.yaml'));

    it('returns an error', () => {
      return expect(loadL2DKeys()).to.eventually.be.rejected;
    });
  });
});
