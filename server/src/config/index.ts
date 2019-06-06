import * as _ from 'lodash';
import { resolve } from 'path';
import * as Influx from 'influx';
import * as productionConfig from './production';
import * as localConfig from './local';

let config = {
    port: 3000,
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

    redis: {
        host: '127.0.0.1',
        port: 6379
    },

    session: {
        secret: 'some-secret-password-at-least-32-characters-long',
        cookie: {
            maxAge: 1000 * 60 * 60 * 3,
            secure: false
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
        logging: false,
        entities: [resolve('./**/*.entity.ts')]
    },

    influx: {
        host: '127.0.0.1',
        database: 'nestify',
        schema: [
            {
                measurement: 'system_status',
                fields: {
                    "cpu": Influx.FieldType.FLOAT,
                    "memory": Influx.FieldType.INTEGER,
                    "ppid": Influx.FieldType.INTEGER,
                    "pid": Influx.FieldType.INTEGER,
                    "ctime": Influx.FieldType.INTEGER,
                    "elapsed": Influx.FieldType.INTEGER,
                    "timestamp": Influx.FieldType.INTEGER
                },
                tags: [
                    'status'
                ]
            }
        ]
    },

    websocket: {
        port: 9000
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
