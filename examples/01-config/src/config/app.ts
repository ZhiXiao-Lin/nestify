import { env } from '@nestify/config';

export default {
  env: env('NODE_ENV'),
  port: env('PORT'),
};
