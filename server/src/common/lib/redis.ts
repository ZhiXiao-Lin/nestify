import * as Redis from 'ioredis';
import { config } from '../../config';
import { Logger } from './logger';

const redis = new Redis({ ...config.redis });

Logger.trace('Redis connected');

export { redis };
export default redis;