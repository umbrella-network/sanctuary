import { InfluxDB } from '@influxdata/influxdb-client';
import { settings } from '../../config/initInfluxDB';

const { url, token } = settings.influxDB;

const influxConn = new InfluxDB({ url, token });

export default influxConn;
