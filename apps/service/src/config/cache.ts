import { env } from '@nestify/config';
import * as redisStore from 'cache-manager-ioredis';

export default {
    store: redisStore,
    host: env('REDIS_HOST'),
    port: env('REDIS_PORT'),
    ttl: 10 * 60
};
