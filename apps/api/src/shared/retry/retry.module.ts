// ============================================================================
// Retry Module - Automatic retry with exponential backoff
// ============================================================================

import { Module, Global } from '@nestjs/common';
import { RetryService } from './retry.service';

@Global()
@Module({
    providers: [RetryService],
    exports: [RetryService],
})
export class RetryModule {}
