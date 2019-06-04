import { merge } from 'lodash';
import productionConfig from './production';

let config = {
	API_ROOT: 'http://127.0.0.1:3000/api',
	SOCKET_ROOT: 'http://127.0.0.1:9000',
	STATIC_ROOT: 'http://127.0.0.1:3000/static',

	PAGE_SIZE: 10,

	TITLE: '方大特钢',
	COPYRIGHT: '江西方大钢铁集团有限公司'
};

if (process.env.NODE_ENV === 'production') {
	config = merge(config, productionConfig);
}

export default config;
