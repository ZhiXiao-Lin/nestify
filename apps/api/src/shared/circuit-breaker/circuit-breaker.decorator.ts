// ============================================================================
// Circuit Breaker Decorator
// ============================================================================

import { SetMetadata } from '@nestjs/common';
import { CircuitBreakerOptions } from './circuit-breaker.service';

export const CIRCUIT_BREAKER_KEY = 'circuit_breaker';
export const CIRCUIT_BREAKER_OPTIONS = 'circuit_breaker_options';

/**
 * Decorator to mark a method for circuit breaker protection
 */
export function CircuitBreaker(options: CircuitBreakerOptions) {
    return SetMetadata(CIRCUIT_BREAKER_OPTIONS, options);
}
