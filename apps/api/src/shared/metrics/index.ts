import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsInterceptor, MetricsService } from '@a3s-lab/observability';
import { MetricsController } from './metrics.controller';

export * from '@a3s-lab/observability';
export { MetricsController } from './metrics.controller';

@Global()
@Module({
    controllers: [MetricsController],
    providers: [
        MetricsService,
        { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    ],
    exports: [MetricsService],
})
export class MetricsModule {}
