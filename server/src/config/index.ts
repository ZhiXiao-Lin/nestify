import * as _ from 'lodash';
import { resolve } from 'path';
import * as Influx from 'influx';
import * as productionConfig from './production';
import { LoggerLevel } from '../common/lib/logger';

let config = {
    port: 3000,
    hostName: '0.0.0.0',
    serverUrl: 'http://127.0.0.1:3000',

    helmet: { hidePoweredBy: { setTo: 'C++ 12' } },

    rateLimit: {
        timeWindow: 1,
        max: 5
    },

    fileUpload: {
        createParentPath: true,
        limits: { fileSize: 50 * 1024 * 1024 }
    },

    static: {
        root: 'static',
        prefix: '/static/',
        uploadPath: '/uploads'
    },

    logger: {
        level: LoggerLevel.ALL
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
                    cpu: Influx.FieldType.FLOAT,
                    memory: Influx.FieldType.INTEGER,
                    ppid: Influx.FieldType.INTEGER,
                    pid: Influx.FieldType.INTEGER,
                    ctime: Influx.FieldType.INTEGER,
                    elapsed: Influx.FieldType.INTEGER,
                    timestamp: Influx.FieldType.INTEGER
                },
                tags: ['status']
            }
        ]
    },

    qiniu: {
        accessKey: 'YyxyEPUcKk2vDpjKkCwZQaAC_uaUaxX1eqd26hL6',
        secretKey: 'gCpsZaPRn8YqWbKzMsVgcEBsQk63Aev9qX2VN_eV',
        domain: 'http://img.nestify.cn',
        policy: {
            scope: 'nestify',
            expires: 7200,
            returnBody:
                '{"key":"$(key)","hash":"$(etag)","fsize":$(fsize),"bucket":"$(bucket)","name":"$(x:name)"}'
        }
    },

    es: {
        host: '127.0.0.1:9200',
        log: 'trace'
    },

    mq: {
        url: 'amqp://localhost',
        options: {}
    },

    wechat: {
        token: 'wechattoken',
    }
};

if (process.env.NODE_ENV === 'production') {
    config = _.merge(config, productionConfig.default);
}

export { config };
export default config;
