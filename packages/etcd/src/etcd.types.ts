/**
 * Etcd configuration options
 */
export const ETCD_MODULE_OPTIONS = 'ETCD_MODULE_OPTIONS';

export interface EtcdModuleOptions {
    /** Etcd endpoints */
    endpoints: string[];
    /** Authentication */
    auth?: {
        username?: string;
        password?: string;
    };
    /** TLS configuration */
    tls?: {
        cert?: string;
        key?: string;
        ca?: string;
    };
    /** Default request options */
    requestOptions?: {
        timeout?: number;
        retry?: number;
    };
}

/**
 * Watch event types
 */
export type WatchEventType = 'put' | 'delete';

/**
 * Watch event from etcd
 */
export interface WatchEvent<T = unknown> {
    type: WatchEventType;
    key: string;
    value: T | null;
    version: number;
    modRevision?: number;
}

/**
 * Watch callback function
 */
export type WatchCallback<T = unknown> = (event: WatchEvent<T>) => void;

/**
 * Configuration entry
 */
export interface ConfigEntry<T = unknown> {
    key: string;
    value: T;
    version: number;
    revision: number;
    created?: boolean;
}

/**
 * Lease info
 */
export interface LeaseInfo {
    id: string;
    ttl: number;
    remainingTTL: number;
}

/**
 * Health check result
 */
export interface HealthResult {
    healthy: boolean;
    leader?: string;
    etcdVersion?: string;
}
