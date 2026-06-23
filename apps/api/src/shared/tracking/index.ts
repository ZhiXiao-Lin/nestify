import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TrackingInterceptor } from '@a3s-lab/observability';

export * from '@a3s-lab/observability';

@Global()
@Module({
    providers: [{ provide: APP_INTERCEPTOR, useClass: TrackingInterceptor }],
})
export class TrackingModule {}
