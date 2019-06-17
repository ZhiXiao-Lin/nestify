import { merge } from 'lodash';
import productionConfig from './production';

let config = {
  API_ROOT: 'http://127.0.0.1:3000/api',
  SOCKET_ROOT: 'http://127.0.0.1:3000',
  STATIC_ROOT: 'http://127.0.0.1:3000/static',
  QINIU_UPLOAD_URL: 'https://up-z2.qiniup.com',

  PAGE_SIZE: 10,

  TITLE: 'Nestify',
  COPYRIGHT: 'NestifyStack',
};

if (process.env.NODE_ENV === 'production') {
  config = merge(config, productionConfig);
}

export default config;
