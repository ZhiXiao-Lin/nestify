// ============================================================================
// Feature Flags Guard - Protects routes based on feature flags
// ============================================================================

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from './feature-flags.service';

export const FEATURE_FLAG_KEY = 'feature_flag';

/**
 * Require a feature flag to be enabled
 */
export const RequiresFeature = (flagName: string) =>
    SetMetadata(FEATURE_FLAG_KEY, flagName);

@Injectable()
export class FeatureFlagsGuard implements CanActivate {
    constructor(
        private readonly featureFlagsService: FeatureFlagsService,
        private readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const flagName = this.reflector.get<string>(
            FEATURE_FLAG_KEY,
            context.getHandler(),
        );

        if (!flagName) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        const evaluation = await this.featureFlagsService.evaluate(flagName, {
            userId: user?.sub,
            organizationId: user?.organizationId,
            groups: user?.groups,
        });

        if (!evaluation.enabled) {
            throw new ForbiddenException(
                `This feature is currently unavailable: ${flagName}`,
            );
        }

        return true;
    }
}
