import { InfluxDB, HttpError } from '@influxdata/influxdb-client';
import { OrgsAPI, BucketsAPI } from '@influxdata/influxdb-client-apis';
import { Point } from '@influxdata/influxdb-client';

/**
 * If bucket name does not exist, it'll create one.
 */
export async function eraseBucket(influxConn: InfluxDB, org: string, bucketName: string) {
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

export async function registerPoint(
  point: Point,
  influxConnection: InfluxDB,
  org: string,
  bucket: string
): Promise<void> {
  const writeApi = influxConnection.getWriteApi(org, bucket, 'ms');

  writeApi.writePoint(point);

  await writeApi.close();
}

export async function collectRowsFromQuery(
  query: string,
  influxConnection: InfluxDB,
  org: string,
  bucketName: string
): Promise<any[]> {
  const queryApi = influxConnection.getQueryApi(org);
  const fluxQuery = `from(bucket:"${bucketName}")${query}`;

  const rows = await queryApi.collectRows(fluxQuery);

  return rows;
}
