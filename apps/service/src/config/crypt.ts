import { env } from '@nestify/config';

export default {
    salt: env('SALT')
};
