import { Global, Module } from '@nestjs/common';
import { FeatureFlagsGuard } from './feature-flags.guard';
import { FeatureFlagsService } from './feature-flags.service';

export { FeatureFlagsService } from './feature-flags.service';
export { FeatureFlagsGuard, RequiresFeature } from './feature-flags.guard';
export { FeatureFlag, FeatureFlagEvaluation } from './feature-flags.decorator';

@Global()
@Module({
    providers: [FeatureFlagsService, FeatureFlagsGuard],
    exports: [FeatureFlagsService, FeatureFlagsGuard],
})
export class FeatureFlagsModule {}
