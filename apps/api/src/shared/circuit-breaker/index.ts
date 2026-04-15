// ============================================================================
// Circuit Breaker Module
// ============================================================================

export {
    CircuitBreakerService,
    CircuitBreaker,
    CircuitBreakerOpenError,
    CircuitState,
} from './circuit-breaker.service';
export type { CircuitBreakerOptions, CircuitBreakerStats } from './circuit-breaker.service';
export { CircuitBreakerModule } from './circuit-breaker.module';
