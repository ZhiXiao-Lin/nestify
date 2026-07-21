/** Common options for Redis cache operations. */
export interface CacheOptions {
    /** Expiration time in seconds. */
    ttl?: number;
    /** Logical key prefix. */
    prefix?: string;
}

/** Distributed-lock timing options. */
export interface LockOptions {
    /** Maximum time to wait for the lock, in milliseconds. */
    waitTime?: number;
    /** Lock lease duration, in milliseconds. */
    leaseTime?: number;
}

/** Cache decorator metadata. */
export interface CacheMetadata {
    /** Cache key. */
    key: string;
    /** Expiration time in seconds. */
    ttl?: number;
}

/** Distributed-lock decorator metadata. */
export interface LockMetadata {
    /** Lock name. */
    key: string;
    /** Maximum wait time in milliseconds. */
    waitTime?: number;
    /** Lock lease duration in milliseconds. */
    leaseTime?: number;
}

/** Result of a batch operation. */
export interface BatchResult<T = any> {
    /** Successfully processed items. */
    succeeded: T[];
    /** Items that failed with their normalized error. */
    failed: Array<{ item: T; error: Error }>;
}
