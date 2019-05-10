import { resolve } from 'path';

export default {
	port: 8007,
	orm: {
		dropSchema: false,
		synchronize: false,
		logging: false,
		entities: [ resolve('../**/*.entity.js') ]
	}
};
