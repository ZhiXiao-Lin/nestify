// ============================================================================
// Rate Limiting Decorators
// ============================================================================

import { SetMetadata } from '@nestjs/common';
import { RateLimitConfig, DEFAULT_RATE_LIMITS } from './rate-limiting.service';

/**
 * Rate limit decorator options
 */
export interface RateLimitOptions {
    /** Maximum requests allowed */
    limit: number;
    /** Window size in seconds */
    windowSeconds: number;
}

export const RATE_LIMIT_KEY = 'rate_limit_config';

/**
 * Apply rate limiting to a route
 */
export const RateLimit = (options: RateLimitOptions) =>
    SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Apply strict rate limiting (auth endpoints)
 */
export const RateLimitAuth = () =>
    SetMetadata(RATE_LIMIT_KEY, DEFAULT_RATE_LIMITS.auth);

/**
 * Apply API rate limiting
 */
export const RateLimitApi = () =>
    SetMetadata(RATE_LIMIT_KEY, DEFAULT_RATE_LIMITS.api);

/**
 * Apply upload rate limiting
 */
export const RateLimitUpload = () =>
    SetMetadata(RATE_LIMIT_KEY, DEFAULT_RATE_LIMITS.upload);
