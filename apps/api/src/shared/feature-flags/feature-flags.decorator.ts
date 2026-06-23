// ============================================================================
// Feature Flags Decorators
// ============================================================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Check if a feature flag is enabled
 */
export const FeatureFlag = createParamDecorator(async (flagName: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    const flagsService = request.featureFlagsService;
    if (!flagsService) {
        return false;
    }

    return flagsService.isEnabled(flagName);
});

/**
 * Get feature flag evaluation result
 */
export const FeatureFlagEvaluation = createParamDecorator(async (flagName: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    const flagsService = request.featureFlagsService;
    if (!flagsService) {
        return { enabled: false, reason: 'Service not available' };
    }

    return flagsService.evaluate(flagName, {
        userId: user?.sub,
        organizationId: user?.organizationId,
        groups: user?.groups,
    });
});
