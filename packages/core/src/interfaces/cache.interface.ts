export interface CachingConfig {
    ttl: number | TtlFunction;
}

export interface TtlFunction {
    (result: any): number;
}

export interface CacheOptions {
    /**
     * Promise library to replace global.Promise
     */
    promiseDependency?: any;
    isCacheableValue?(value: any): boolean;
}

export type CallbackFunc<T> = (error: any, result: T) => void;
export type WrapArgsType<T> = string | ((callback: CallbackFunc<T>) => void) | CachingConfig | CallbackFunc<T>;

export interface ICacheService {
    set<T>(key: string, value: T, options: CachingConfig, callback?: (error: any) => void): void;
    set<T>(key: string, value: T, ttl: number, callback?: (error: any) => void): void;
    set<T>(key: string, value: T, options: CachingConfig): Promise<any>;
    set<T>(key: string, value: T, ttl: number): Promise<any>;

    wrap<T>(...args: WrapArgsType<T>[]): Promise<any>;

    get<T>(key: string, callback: (error: any, result: T) => void): void;
    get<T>(key: string): Promise<any>;

    del(key: string, callback: (error: any) => void): void;
    del(key: string): Promise<any>;
}
