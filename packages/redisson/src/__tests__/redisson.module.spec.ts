import { RedissonModule } from '../redisson.module';
import { createRedissonModuleOptions } from '../redisson-options';

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
                shutdownTimeoutMs: 5000,
                patternScanCount: 100,
                patternDeleteBatchSize: 20,
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
            shutdownTimeoutMs: 5000,
            patternScanCount: 100,
            patternDeleteBatchSize: 20,
        });
    });

    it('rejects unsafe numeric connection and lifecycle options', () => {
        expect(() => createRedissonModuleOptions({ port: 'invalid' })).toThrow('finite number');
        expect(() => createRedissonModuleOptions({ port: 0 })).toThrow('between 1 and 65535');
        expect(() => createRedissonModuleOptions({ db: -1 })).toThrow('at least 0');
        expect(() => createRedissonModuleOptions({ lockWatchdogTimeout: 0 })).toThrow('must be positive');
        expect(() => createRedissonModuleOptions({ lockWatchdogTimeout: 'invalid' })).toThrow('must be an integer');
        expect(() => createRedissonModuleOptions({ shutdownTimeoutMs: 0 })).toThrow('positive integer');
        expect(() =>
            createRedissonModuleOptions({
                options: { port: 70_000 },
            }),
        ).toThrow('between 1 and 65535');
    });
});
