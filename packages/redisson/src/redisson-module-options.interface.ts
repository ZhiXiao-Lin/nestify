import type { IRedissonConfig } from 'node-redisson';

export interface RedissonModuleOptions extends IRedissonConfig {
    /** Maximum time to drain tracked helper operations before closing Redis. Defaults to 10 seconds. */
    shutdownTimeoutMs?: number;
    /** Redis SCAN count hint used by deleteByPattern. Defaults to 250. */
    patternScanCount?: number;
    /** Maximum number of delete commands executed concurrently. Defaults to 50. */
    patternDeleteBatchSize?: number;
}
