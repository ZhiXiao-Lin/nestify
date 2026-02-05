/**
 * Redis 键值对操作的通用类型
 */
export interface CacheOptions {
    /** 过期时间（秒） */
    ttl?: number;
    /** 键的前缀 */
    prefix?: string;
}

/**
 * 分布式锁配置选项
 */
export interface LockOptions {
    /** 等待获取锁的时间（毫秒） */
    waitTime?: number;
    /** 锁的租期时间（毫秒） */
    leaseTime?: number;
}

/**
 * 缓存装饰器元数据
 */
export interface CacheMetadata {
    /** 缓存键 */
    key: string;
    /** 过期时间（秒） */
    ttl?: number;
}

/**
 * 分布式锁装饰器元数据
 */
export interface LockMetadata {
    /** 锁的键名 */
    key: string;
    /** 等待时间（毫秒） */
    waitTime?: number;
    /** 租期时间（毫秒） */
    leaseTime?: number;
}

/**
 * 批量操作结果
 */
export interface BatchResult<T = any> {
    /** 成功的项 */
    succeeded: T[];
    /** 失败的项 */
    failed: Array<{ item: T; error: Error }>;
}
