import { InfluxDB, HttpError } from '@influxdata/influxdb-client';
import { OrgsAPI, BucketsAPI } from '@influxdata/influxdb-client-apis';

import { settings } from '../../config/initInfluxDB';

const { org } = settings.influxDB;

/**
 * If bucket name does not exist, it'll create one.
 */
export async function eraseBucket(influxConn: InfluxDB, bucketName: string) {
  const orgsAPI = new OrgsAPI(influxConn);

  const organizations = await orgsAPI.getOrgs({ org });
  const orgID = organizations.orgs[0].id;

  const bucketsAPI = new BucketsAPI(influxConn);

  try {
    const buckets = await bucketsAPI.getBuckets({ orgID, name: bucketName });

    if (buckets && buckets.buckets && buckets.buckets.length) {
      const bucketID = buckets.buckets[0].id;
      await bucketsAPI.deleteBucketsID({ bucketID });
    }
  } catch (e) {
    if (e instanceof HttpError && e.statusCode == 404) {
      // OK, bucket not found
    } else {
      throw e;
    }
  }

  const bucket = await bucketsAPI.postBuckets({ body: { orgID, name: bucketName, retentionRules: [] } });
  return bucket;
}
