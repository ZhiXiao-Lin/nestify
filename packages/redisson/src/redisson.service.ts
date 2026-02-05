import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redisson } from 'node-redisson';
import { RedissonModuleOptions } from './redisson-module-options.interface';
import { MODULE_OPTIONS_TOKEN } from './redisson.module-definition';

@Injectable()
export class RedissonService extends Redisson implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedissonService.name);

    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: RedissonModuleOptions,
    ) {
        if (!options) {
            throw new Error('RedissonModuleOptions is not defined');
        }
        super(options);
    }

    async onModuleInit() {
        try {
            // Test connection by pinging Redis
            await this.redis.ping();
            this.logger.log('Successfully connected to Redis via Redisson');
        } catch (error) {
            this.logger.error('Failed to connect to Redis', error);
            throw error;
        }
    }

    async onModuleDestroy() {
        try {
            await this.quit();
            this.logger.log('Redis connection closed');
        } catch (error) {
            this.logger.error('Error closing Redis connection', error);
        }
    }

    /**
     * 执行带锁的操作
     * @param key 锁的键名
     * @param callback 需要执行的回调函数
     * @param waitTime 等待时间（毫秒）
     * @param leaseTime 锁的租期（毫秒）
     * @returns 回调函数的返回值
     */
    async withLock<T>(key: string, callback: () => Promise<T> | T, waitTime = 5000, leaseTime = 10000): Promise<T> {
        const lock = this.getLock(key);
        const acquired = await lock.tryLock(waitTime, leaseTime);

        if (!acquired) {
            throw new Error(`Failed to acquire lock: ${key}`);
        }

        try {
            this.logger.debug(`Lock acquired: ${key}`);
            return await callback();
        } finally {
            await lock.unlock();
            this.logger.debug(`Lock released: ${key}`);
        }
    }

    /**
     * 缓存装饰器辅助方法 - 获取缓存或执行函数
     * @param key 缓存键
     * @param factory 数据工厂函数
     * @param ttl 过期时间（秒）
     * @returns 缓存的数据或新数据
     */
    async getOrSet<T>(key: string, factory: () => Promise<T> | T, ttl?: number): Promise<T> {
        // 尝试从缓存获取
        const cached = await this.redis.get(key);
        if (cached) {
            try {
                return JSON.parse(cached) as T;
            } catch {
                // 如果解析失败，返回原始值
                return cached as unknown as T;
            }
        }

        // 执行工厂函数获取数据
        const data = await factory();

        // 存储到缓存
        const value = typeof data === 'string' ? data : JSON.stringify(data);
        if (ttl) {
            await this.redis.setex(key, ttl, value);
        } else {
            await this.redis.set(key, value);
        }

        return data;
    }

    /**
     * 批量删除匹配模式的键
     * @param pattern 键的匹配模式
     * @returns 删除的键数量
     */
    async deleteByPattern(pattern: string): Promise<number> {
        const keys = await this.redis.keys(pattern);

        if (keys.length === 0) {
            return 0;
        }

        await this.redis.del(...keys);
        this.logger.debug(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
        return keys.length;
    }

    /**
     * 设置带过期时间的 JSON 数据
     * @param key 键名
     * @param value 值（会自动序列化为 JSON）
     * @param ttl 过期时间（秒）
     */
    async setJSON<T>(key: string, value: T, ttl?: number): Promise<void> {
        const serialized = JSON.stringify(value);

        if (ttl) {
            await this.redis.setex(key, ttl, serialized);
        } else {
            await this.redis.set(key, serialized);
        }
    }

    /**
     * 获取 JSON 数据
     * @param key 键名
     * @returns 反序列化的数据或 null
     */
    async getJSON<T>(key: string): Promise<T | null> {
        const value = await this.redis.get(key);

        if (!value) {
            return null;
        }

        try {
            return JSON.parse(value) as T;
        } catch (error) {
            this.logger.error(`Failed to parse JSON for key: ${key}`, error);
            return null;
        }
    }

    /**
     * 检查键是否存在
     * @param key 键名
     * @returns 是否存在
     */
    async exists(key: string): Promise<boolean> {
        const result = await this.redis.exists(key);
        return result === 1;
    }

    /**
     * 设置键的过期时间
     * @param key 键名
     * @param ttl 过期时间（秒）
     * @returns 是否成功
     */
    async expire(key: string, ttl: number): Promise<boolean> {
        const result = await this.redis.expire(key, ttl);
        return result === 1;
    }

    /**
     * 删除键
     * @param keys 要删除的键
     * @returns 删除的键数量
     */
    async delete(...keys: string[]): Promise<number> {
        return await this.redis.del(...keys);
    }

    /**
     * 增量操作
     * @param key 键名
     * @param increment 增量值（默认为 1）
     * @returns 增量后的值
     */
    async increment(key: string, increment = 1): Promise<number> {
        return await this.redis.incrby(key, increment);
    }

    /**
     * 减量操作
     * @param key 键名
     * @param decrement 减量值（默认为 1）
     * @returns 减量后的值
     */
    async decrement(key: string, decrement = 1): Promise<number> {
        return await this.redis.decrby(key, decrement);
    }

    /**
     * 获取键值
     * @param key 键名
     * @returns 键值或 null
     */
    async get(key: string): Promise<string | null> {
        return await this.redis.get(key);
    }

    /**
     * 设置键值
     * @param key 键名
     * @param value 值
     * @param ttl 过期时间（秒），可选
     */
    async set(key: string, value: string, ttl?: number): Promise<void> {
        if (ttl) {
            await this.redis.setex(key, ttl, value);
        } else {
            await this.redis.set(key, value);
        }
    }

    /**
     * 设置哈希字段
     * @param key 哈希键
     * @param field 字段名
     * @param value 字段值
     */
    async hset(key: string, field: string, value: string): Promise<void> {
        await this.redis.hset(key, field, value);
    }

    /**
     * 获取哈希字段
     * @param key 哈希键
     * @param field 字段名
     * @returns 字段值或 null
     */
    async hget(key: string, field: string): Promise<string | null> {
        return await this.redis.hget(key, field);
    }

    /**
     * 获取整个哈希
     * @param key 哈希键
     * @returns 哈希对象
     */
    async hgetall(key: string): Promise<Record<string, string>> {
        return await this.redis.hgetall(key);
    }

    /**
     * 删除哈希字段
     * @param key 哈希键
     * @param fields 要删除的字段
     * @returns 删除的字段数量
     */
    async hdel(key: string, ...fields: string[]): Promise<number> {
        return await this.redis.hdel(key, ...fields);
    }

    /**
     * 执行 Lua 脚本
     * @param script Lua 脚本内容
     * @param keys 键数组
     * @param args 参数数组
     * @returns 脚本执行结果
     */
    async eval(script: string, keys: string[], args: string[]): Promise<any> {
        const numKeys = keys.length;
        return await this.redis.eval(script, numKeys, ...keys, ...args);
    }

    /**
     * 执行已缓存的 Lua 脚本（通过 SHA1）
     * @param sha1 脚本的 SHA1 哈希
     * @param keys 键数组
     * @param args 参数数组
     * @returns 脚本执行结果
     */
    async evalsha(sha1: string, keys: string[], args: string[]): Promise<any> {
        const numKeys = keys.length;
        return await this.redis.evalsha(sha1, numKeys, ...keys, ...args);
    }

    /**
     * 加载 Lua 脚本并返回 SHA1
     * @param script Lua 脚本内容
     * @returns 脚本的 SHA1 哈希
     */
    async scriptLoad(script: string): Promise<string> {
        return (await this.redis.call('SCRIPT', 'LOAD', script)) as string;
    }
}
