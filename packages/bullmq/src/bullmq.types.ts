// ============================================================================
// BullMQ Module Options
// ============================================================================

export interface BullMQModuleOptions {
    /** Redis connection URL */
    connection: {
        host: string;
        port: number;
        password?: string;
        db?: number;
    };
    /** Default job options */
    defaultJobOptions?: {
        attempts?: number;
        backoff?: {
            type: 'exponential' | 'fixed';
            delay?: number;
        };
        removeOnComplete?: boolean | number;
        removeOnFail?: boolean | number;
    };
    /** Queue prefixes */
    prefix?: string;
}

export interface BullMQOptionsFactory {
    createBullMQOptions(): Promise<BullMQModuleOptions> | BullMQModuleOptions;
}
