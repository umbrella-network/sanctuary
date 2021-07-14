import { expect } from 'chai';
import { eraseBucket } from '../../../src/services/analytics/influxUtils';
import influxConn from '../../../src/services/analytics/influxConnection';

describe('influxUtils', () => {
  describe('eraseBucket', () => {
    it('drops and recreates a bucket', async () => {
      const testBucketName = 'testBucket';
      const bucket1 = await eraseBucket(influxConn, testBucketName);
      const bucket2 = await eraseBucket(influxConn, testBucketName);

      console.log(bucket1.id, bucket2.id);

      expect(bucket1.id).to.not.equal(bucket2.id);
    });
  });
});
