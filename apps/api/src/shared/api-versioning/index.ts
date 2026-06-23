import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ApiVersioningInterceptor } from '@a3s-lab/http';

export * from '@a3s-lab/http';

@Global()
@Module({
    providers: [{ provide: APP_INTERCEPTOR, useClass: ApiVersioningInterceptor }],
})
export class ApiVersioningModule {}
