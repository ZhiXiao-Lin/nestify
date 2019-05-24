import * as _ from 'lodash';
import { resolve } from 'path';
import * as productionConfig from './production';
import * as localConfig from './local';

let config = {
	port: '3000',
	hostName: '0.0.0.0',
	serverUrl: 'http://127.0.0.1:3000',

	static: {
		root: 'static',
		prefix: '/static/',
		uploadPath: '/uploads'
	},

	jwt: {
		secretOrPrivateKey: 'secretKey',
		signOptions: {
			expiresIn: 360000
		}
	},

	cache: {
		ttl: 10,
		max: 1000
	},

	orm: {
		type: 'postgres',
		host: '127.0.0.1',
		port: 5432,
		database: 'nestify',
		username: 'nestify',
		password: '123456',
		dropSchema: false,
		synchronize: false,
		logging: true,
		entities: [ resolve('./**/*.entity.ts') ]
	}
};

if (process.env.NODE_ENV === 'production') {
	config = _.merge(config, productionConfig.default);
}

if (!!process.env.DB_SYNC) {
	config = _.merge(config, localConfig.default);
}

export { config };
export default config;
