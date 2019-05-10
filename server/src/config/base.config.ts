import { resolve } from 'path';

export default {
	port: '3000',
	hostName: '0.0.0.0',

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
		entities: [ resolve('../**/*.entity.ts') ]
	}
};
