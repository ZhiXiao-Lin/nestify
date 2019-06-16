import { merge } from 'lodash';
import productionConfig from './production';

let config = {
  API_ROOT: 'http://127.0.0.1:3000/api',
  SOCKET_ROOT: 'http://127.0.0.1:3000',
  STATIC_ROOT: 'http://127.0.0.1:3000/static',

  PAGE_SIZE: 10,

  TITLE: 'Nestify - 中后台全栈解决方案',
  COPYRIGHT: 'NestifyStack',
};

if (process.env.NODE_ENV === 'production') {
  config = merge(config, productionConfig);
}

export default config;
