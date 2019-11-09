import { env } from '../index';

export default {
    env: env('NODE_ENV'),
    port: env('PORT')
};
