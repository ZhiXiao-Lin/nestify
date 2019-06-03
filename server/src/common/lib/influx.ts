import * as Influx from 'influx';
import { config } from '../../config';

const influx = new Influx.InfluxDB(config.influx);

export { influx };
export default influx;