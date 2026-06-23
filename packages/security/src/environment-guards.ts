import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    Logger,
    UseGuards,
    applyDecorators,
} from '@nestjs/common';
import type { Request } from 'express';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', '0:0:0:0:0:0:0:1', 'localhost']);

@Injectable()
export class LocalOnlyGuard implements CanActivate {
    private readonly logger = new Logger(LocalOnlyGuard.name);

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        const remote = request.socket?.remoteAddress || request.ip;
        if (!remote || !LOOPBACK_HOSTS.has(remote)) {
            this.logger.warn(`[local-only] denied: remote=${remote ?? 'unknown'}`);
            throw new ForbiddenException('local-only endpoint');
        }
        return true;
    }
}

@Injectable()
export class DevOnlyGuard implements CanActivate {
    canActivate(): boolean {
        if (process.env.NODE_ENV === 'production') {
            throw new ForbiddenException('development-only endpoint');
        }
        return true;
    }
}

export function DevOnly(): MethodDecorator & ClassDecorator {
    return applyDecorators(UseGuards(DevOnlyGuard));
}
