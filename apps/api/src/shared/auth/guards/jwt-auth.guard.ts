// ============================================================================
// JWT Auth Guard - Validates JWT tokens
// ============================================================================

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, SetMetadata } from '@nestjs/common';
import { JwtService } from '../jwt/jwt.service';
import { Request } from 'express';

/**
 * Metadata key for public routes (skip auth)
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route as public (skip JWT validation)
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        try {
            const payload = this.jwtService.verifyAccessToken(token);
            // Attach user to request
            (request as any).user = payload;
            (request as any).userId = payload.sub;
            (request as any).organizationId = payload.organizationId;
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }

        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            return undefined;
        }

        const [type, token] = authHeader.split(' ');
        return type === 'Bearer' ? token : undefined;
    }
}
