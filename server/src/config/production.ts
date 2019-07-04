import { resolve } from 'path';
import { LoggerLevel } from '../common/lib/logger';

export default {
	port: 8008,
	serverUrl: 'http://wwww.nestify.cn',

	logger: {
		level: LoggerLevel.INFO
	},

	cache: {
		ttl: 3600,
		max: 1000
	},

	orm: {
		dropSchema: false,
		synchronize: false,
		logging: false,
		entities: [resolve('./**/*.entity.js')]
	}
};
