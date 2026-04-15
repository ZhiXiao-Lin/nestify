// ============================================================================
// Feature Flags Service - Feature toggles and gradual rollouts
// ============================================================================

import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { RedissonService } from '@a3s-lab/redisson';

export interface FeatureFlag {
    name: string;
    enabled: boolean;
    description?: string;
    /** Rollout percentage (0-100) */
    rolloutPercentage?: number;
    /** User groups that always have access */
    allowedGroups?: string[];
    /** User groups that never have access */
    excludedGroups?: string[];
    /** Metadata for the feature */
    metadata?: Record<string, unknown>;
    /** When the feature was enabled */
    enabledAt?: Date;
    /** When the feature will be disabled (optional) */
    expiresAt?: Date;
}

export interface FeatureFlagEvaluation {
    enabled: boolean;
    reason: string;
    metadata?: Record<string, unknown>;
}

/**
 * Default feature flags
 */
export const DEFAULT_FEATURE_FLAGS: Record<string, Omit<FeatureFlag, 'name' | 'enabledAt'>> = {
    'new-dashboard': { enabled: true, rolloutPercentage: 100 },
    'ai-assistant': { enabled: true, rolloutPercentage: 50 },
    'advanced-analytics': { enabled: false },
    'dark-mode': { enabled: true, rolloutPercentage: 100 },
};

/**
 * Feature Flags Service
 */
@Injectable()
export class FeatureFlagsService implements OnModuleDestroy {
    private readonly logger = new Logger(FeatureFlagsService.name);
    private readonly keyPrefix = 'feature:';
    private readonly localCache: Map<string, FeatureFlag> = new Map();

    constructor(private readonly redis: RedissonService) {}

    /**
     * Check if a feature flag is enabled
     */
    async isEnabled(flagName: string): Promise<boolean> {
        const evaluation = await this.evaluate(flagName);
        return evaluation.enabled;
    }

    /**
     * Evaluate a feature flag for a specific user/context
     */
    async evaluate(
        flagName: string,
        context?: {
            userId?: string;
            organizationId?: string;
            groups?: string[];
            attributes?: Record<string, unknown>;
        },
    ): Promise<FeatureFlagEvaluation> {
        const flag = await this.getFlag(flagName);

        if (!flag) {
            return { enabled: false, reason: 'Flag not found' };
        }

        if (!flag.enabled) {
            return { enabled: false, reason: 'Flag disabled', metadata: flag.metadata };
        }

        // Check expiration
        if (flag.expiresAt && new Date() > flag.expiresAt) {
            return { enabled: false, reason: 'Flag expired', metadata: flag.metadata };
        }

        // Check excluded groups
        if (context?.groups && flag.excludedGroups) {
            const hasExcludedGroup = context.groups.some(g => flag.excludedGroups!.includes(g));
            if (hasExcludedGroup) {
                return { enabled: false, reason: 'User in excluded group', metadata: flag.metadata };
            }
        }

        // Check allowed groups
        if (context?.groups && flag.allowedGroups) {
            const hasAllowedGroup = context.groups.some(g => flag.allowedGroups!.includes(g));
            if (hasAllowedGroup) {
                return { enabled: true, reason: 'User in allowed group', metadata: flag.metadata };
            }
        }

        // Check rollout percentage
        if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
            const userId = context?.userId ?? context?.organizationId ?? 'anonymous';
            const hash = this.hashUserId(userId, flagName);
            const bucket = hash % 100;

            if (bucket >= flag.rolloutPercentage) {
                return {
                    enabled: false,
                    reason: `User not in rollout percentage (${flag.rolloutPercentage}%)`,
                    metadata: flag.metadata,
                };
            }
        }

        return { enabled: true, reason: 'Flag enabled', metadata: flag.metadata };
    }

    /**
     * Get feature flag definition
     */
    async getFlag(flagName: string): Promise<FeatureFlag | null> {
        // Check local cache first
        const cached = this.localCache.get(flagName);
        if (cached) {
            return cached;
        }

        try {
            const key = `${this.keyPrefix}${flagName}`;
            const data = await this.redis.get(key);

            if (data) {
                const flag = JSON.parse(data) as FeatureFlag;
                this.localCache.set(flagName, flag);
                return flag;
            }

            // Fallback to defaults
            const defaultFlag = DEFAULT_FEATURE_FLAGS[flagName];
            if (defaultFlag) {
                const flag: FeatureFlag = {
                    name: flagName,
                    enabled: defaultFlag.enabled ?? false,
                    rolloutPercentage: defaultFlag.rolloutPercentage,
                    allowedGroups: defaultFlag.allowedGroups,
                    excludedGroups: defaultFlag.excludedGroups,
                    metadata: defaultFlag.metadata,
                };
                this.localCache.set(flagName, flag);
                return flag;
            }

            return null;
        } catch (error) {
            this.logger.error(`Error getting feature flag ${flagName}: ${error}`);
            return null;
        }
    }

    /**
     * Enable a feature flag
     */
    async enable(flagName: string, metadata?: Record<string, unknown>): Promise<void> {
        const existing = await this.getFlag(flagName);
        const flag: FeatureFlag = {
            name: flagName,
            enabled: true,
            enabledAt: new Date(),
            description: existing?.description,
            rolloutPercentage: existing?.rolloutPercentage,
            allowedGroups: existing?.allowedGroups,
            excludedGroups: existing?.excludedGroups,
            metadata,
        };

        await this.saveFlag(flag);
        this.logger.log(`Feature flag enabled: ${flagName}`);
    }

    /**
     * Disable a feature flag
     */
    async disable(flagName: string): Promise<void> {
        const existing = await this.getFlag(flagName);
        const flag: FeatureFlag = {
            name: flagName,
            enabled: false,
            description: existing?.description,
            rolloutPercentage: existing?.rolloutPercentage,
            allowedGroups: existing?.allowedGroups,
            excludedGroups: existing?.excludedGroups,
            metadata: existing?.metadata,
            enabledAt: existing?.enabledAt,
        };

        await this.saveFlag(flag);
        this.logger.log(`Feature flag disabled: ${flagName}`);
    }

    /**
     * Set rollout percentage
     */
    async setRollout(flagName: string, percentage: number): Promise<void> {
        const existing = await this.getFlag(flagName);
        const flag: FeatureFlag = {
            name: flagName,
            enabled: true,
            rolloutPercentage: Math.max(0, Math.min(100, percentage)),
            description: existing?.description,
            allowedGroups: existing?.allowedGroups,
            excludedGroups: existing?.excludedGroups,
            metadata: existing?.metadata,
            enabledAt: existing?.enabledAt,
        };

        await this.saveFlag(flag);
        this.logger.log(`Feature flag rollout set: ${flagName} = ${percentage}%`);
    }

    /**
     * Set expiration date
     */
    async setExpiration(flagName: string, expiresAt: Date): Promise<void> {
        const existing = await this.getFlag(flagName);
        const flag: FeatureFlag = {
            name: flagName,
            enabled: existing?.enabled ?? false,
            description: existing?.description,
            rolloutPercentage: existing?.rolloutPercentage,
            allowedGroups: existing?.allowedGroups,
            excludedGroups: existing?.excludedGroups,
            metadata: existing?.metadata,
            enabledAt: existing?.enabledAt,
            expiresAt,
        };

        await this.saveFlag(flag);
        this.logger.log(`Feature flag expiration set: ${flagName} = ${expiresAt.toISOString()}`);
    }

    /**
     * Get all feature flags
     */
    async getAllFlags(): Promise<FeatureFlag[]> {
        try {
            const redisClient = (this.redis as any).redis;
            const keys = await redisClient.keys(`${this.keyPrefix}*`);
            const flags: FeatureFlag[] = [];

            for (const key of keys) {
                const data = await this.redis.get(key);
                if (data) {
                    flags.push(JSON.parse(data));
                }
            }

            // Add default flags that don't exist in Redis
            for (const [name, defaultFlag] of Object.entries(DEFAULT_FEATURE_FLAGS)) {
                if (!flags.find(f => f.name === name)) {
                    flags.push({
                        name,
                        enabled: defaultFlag.enabled ?? false,
                        rolloutPercentage: defaultFlag.rolloutPercentage,
                        allowedGroups: defaultFlag.allowedGroups,
                        excludedGroups: defaultFlag.excludedGroups,
                        metadata: defaultFlag.metadata,
                    });
                }
            }

            return flags;
        } catch (error) {
            this.logger.error(`Error getting all feature flags: ${error}`);
            return [];
        }
    }

    /**
     * Save flag to Redis
     */
    private async saveFlag(flag: FeatureFlag): Promise<void> {
        const key = `${this.keyPrefix}${flag.name}`;
        await this.redis.set(key, JSON.stringify(flag));
        this.localCache.set(flag.name, flag);
    }

    /**
     * Hash user ID for consistent rollout bucket
     */
    private hashUserId(userId: string, flagName: string): number {
        const input = `${userId}:${flagName}`;
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    onModuleDestroy(): void {
        this.localCache.clear();
    }
}
