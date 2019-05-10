import * as _ from 'lodash';
import productionConfig from './production';

let config = {
	API_URL: 'http://127.0.0.1:3000/api',
	UPLOAD_PATH: 'http://127.0.0.1:3000/static/uploads',
	PAGE_SIZE: 50
};

if (process.env.NODE_ENV === 'production') {
	config = _.merge(config, productionConfig);
}

export default config;
