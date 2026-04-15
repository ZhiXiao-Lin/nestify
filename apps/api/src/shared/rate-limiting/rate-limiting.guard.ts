// ============================================================================
// Rate Limiting Guard - Guard that enforces rate limits
// ============================================================================

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    SetMetadata,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RateLimitingService, RateLimitConfig, DEFAULT_RATE_LIMITS } from './rate-limiting.service';

export const RATE_LIMIT_KEY = 'rate_limit';
export const RATE_LIMIT_CONFIG_KEY = 'rate_limit_config';

export interface RateLimitMetadata {
    name?: string;
    config?: RateLimitConfig;
}

/**
 * Set rate limit for a route
 */
export const RateLimit = (config?: RateLimitConfig) =>
    SetMetadata(RATE_LIMIT_CONFIG_KEY, config ?? DEFAULT_RATE_LIMITS.default);

export const RateLimitByName = (name: keyof typeof DEFAULT_RATE_LIMITS) =>
    SetMetadata(RATE_LIMIT_CONFIG_KEY, DEFAULT_RATE_LIMITS[name]);

@Injectable()
export class RateLimitingGuard implements CanActivate {
    constructor(
        private readonly rateLimitingService: RateLimitingService,
        private readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const config = this.reflector.get<RateLimitConfig>(
            RATE_LIMIT_CONFIG_KEY,
            context.getHandler(),
        );

        // If no rate limit config, skip
        if (!config) {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const identifier = this.getIdentifier(request);

        const result = await this.rateLimitingService.checkLimit(identifier, config);

        // Add rate limit headers to response
        const response = context.switchToHttp().getResponse();
        response.set({
            'X-RateLimit-Limit': config.limit,
            'X-RateLimit-Remaining': result.remaining,
            'X-RateLimit-Reset': result.resetAt.toISOString(),
        });

        if (!result.allowed) {
            response.set('Retry-After', result.retryAfter?.toString() ?? '60');
            throw new HttpException(
                {
                    statusCode: HttpStatus.TOO_MANY_REQUESTS,
                    message: 'Too many requests',
                    error: 'Rate limit exceeded',
                    retryAfter: result.retryAfter,
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        return true;
    }

    /**
     * Get identifier for rate limiting
     * Uses user ID if authenticated, otherwise uses IP
     */
    private getIdentifier(request: Request): string {
        const user = (request as any).user;
        if (user?.sub) {
            return `user:${user.sub}`;
        }

        // Fallback to IP address
        const ip = this.getClientIp(request);
        return `ip:${ip}`;
    }

    /**
     * Extract client IP from request
     */
    private getClientIp(request: Request): string {
        const forwarded = request.headers['x-forwarded-for'];
        if (forwarded) {
            const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
            return ips.trim();
        }
        return request.ip ?? request.socket.remoteAddress ?? 'unknown';
    }
}
