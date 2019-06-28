import { merge } from 'lodash';
import productionConfig from './production';

let config = {
  apiRoot: 'http://127.0.0.1:3000/api',
  socketRoot: 'http://127.0.0.1:3000',
  staticRoot: 'http://127.0.0.1:3000/static',

  qiniu: {
    uploadUrl: 'https://up-z2.qiniup.com',
    domain: 'http://img.nestify.cn',
  },

  pagination: {
    size: 10,
  },

  siteInfo: {
    title: 'Nestify',
    desc: '中后台全栈解决方案',
    copyright: 'NestifyStack',
  },
};

if (process.env.NODE_ENV === 'production') {
  config = merge(config, productionConfig);
}

export { config };
export default config;
