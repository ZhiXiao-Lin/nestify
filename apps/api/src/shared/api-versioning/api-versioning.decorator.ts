// ============================================================================
// API Versioning Decorators
// ============================================================================

import { SetMetadata } from '@nestjs/common';

export const API_VERSION_KEY = 'api_version';

/**
 * Set API version for a controller or route
 */
export const ApiVersion = (version: string) => SetMetadata(API_VERSION_KEY, version);

/**
 * Mark endpoint as deprecated
 */
export const Deprecated = () => SetMetadata('isDeprecated', true);

/**
 * Set sunset date for endpoint
 */
export const Sunset = (date: Date) => SetMetadata('sunsetDate', date);
