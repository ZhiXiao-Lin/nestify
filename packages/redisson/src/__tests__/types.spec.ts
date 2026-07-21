import { BatchResult, CacheMetadata, CacheOptions, LockMetadata, LockOptions } from '../types';

describe('Types', () => {
    describe('CacheOptions', () => {
        it('should allow valid cache options', () => {
            const options: CacheOptions = {
                ttl: 3600,
                prefix: 'cache:',
            };
            expect(options.ttl).toBe(3600);
            expect(options.prefix).toBe('cache:');
        });

        it('should allow partial cache options', () => {
            const options: CacheOptions = {};
            expect(options.ttl).toBeUndefined();
            expect(options.prefix).toBeUndefined();
        });
    });

    describe('LockOptions', () => {
        it('should allow valid lock options', () => {
            const options: LockOptions = {
                waitTime: 5000,
                leaseTime: 10000,
            };
            expect(options.waitTime).toBe(5000);
            expect(options.leaseTime).toBe(10000);
        });
    });

    describe('CacheMetadata', () => {
        it('should require key property', () => {
            const metadata: CacheMetadata = {
                key: 'test-key',
                ttl: 3600,
            };
            expect(metadata.key).toBe('test-key');
            expect(metadata.ttl).toBe(3600);
        });
    });

    describe('LockMetadata', () => {
        it('should require key property', () => {
            const metadata: LockMetadata = {
                key: 'lock-key',
                waitTime: 5000,
                leaseTime: 10000,
            };
            expect(metadata.key).toBe('lock-key');
        });
    });

    describe('BatchResult', () => {
        it('should track succeeded and failed items', () => {
            const result: BatchResult<string> = {
                succeeded: ['item1', 'item2'],
                failed: [{ item: 'item3', error: new Error('Failed') }],
            };
            expect(result.succeeded).toHaveLength(2);
            expect(result.failed).toHaveLength(1);
            expect(result.failed[0].error.message).toBe('Failed');
        });
    });
});
