import { createRedissonModuleOptions } from '../redisson-options';
import { RedissonModule } from '../redisson.module';

describe('RedissonModule', () => {
    describe('register', () => {
        it('should create module with options', async () => {
            const mockOptions = {
                redis: {
                    options: {
                        host: 'localhost',
                        port: 6379,
                    },
                },
            };

            const dynamicModule = RedissonModule.register(mockOptions);

            expect(dynamicModule).toBeDefined();
            expect(dynamicModule.module).toBe(RedissonModule);
            expect(dynamicModule.providers).toBeDefined();
            expect(dynamicModule.exports).toBeDefined();
        });
    });

    describe('registerAsync', () => {
        it('should create module with async options', async () => {
            const mockOptions = {
                redis: {
                    options: {
                        host: 'localhost',
                        port: 6379,
                    },
                },
            };

            const dynamicModule = RedissonModule.registerAsync({
                useFactory: () => mockOptions,
            });

            expect(dynamicModule).toBeDefined();
            expect(dynamicModule.module).toBe(RedissonModule);
            expect(dynamicModule.providers).toBeDefined();
            expect(dynamicModule.exports).toBeDefined();
        });

        it('should support inject option', async () => {
            const mockOptions = {
                redis: {
                    options: {
                        host: 'localhost',
                        port: 6379,
                    },
                },
            };

            const dynamicModule = RedissonModule.registerAsync({
                useFactory: () => mockOptions,
                inject: [],
            });

            expect(dynamicModule).toBeDefined();
        });
    });
});

describe('createRedissonModuleOptions', () => {
    it('creates single-node options from connection values', () => {
        expect(
            createRedissonModuleOptions({
                host: 'cache',
                port: '6380',
                password: '',
                db: '2',
                keyPrefix: 'api:',
                eventAdapter: 'pubsub',
                lockWatchdogTimeout: '5000',
            }),
        ).toEqual({
            redis: {
                options: {
                    host: 'cache',
                    port: 6380,
                    db: 2,
                    keyPrefix: 'api:',
                },
            },
            eventAdapter: 'pubsub',
            lockWatchdogTimeout: 5000n,
        });
    });
});
