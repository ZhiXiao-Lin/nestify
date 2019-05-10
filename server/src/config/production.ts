import { resolve } from 'path';

export default {
	port: 8007,

	cache: {
		ttl: 3600,
		max: 1000
	},

	orm: {
		dropSchema: false,
		synchronize: false,
		logging: false,
		entities: [ resolve('../**/*.entity.js') ]
	}
};
