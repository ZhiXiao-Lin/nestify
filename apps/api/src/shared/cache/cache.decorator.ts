// ============================================================================
// Cache Decorator - Method-level caching
// ============================================================================

import { SetMetadata } from '@nestjs/common';
import { CacheDecoratorOptions } from './cache.service';

export const CACHE_KEY = 'cache_options';

/**
 * Cache the result of a method
 */
export function Cache(options: CacheDecoratorOptions) {
    return SetMetadata(CACHE_KEY, options);
}

/**
 * Cache key prefix decorator
 */
export const CachePrefix = (prefix: string) => SetMetadata(CACHE_KEY, { prefix });
