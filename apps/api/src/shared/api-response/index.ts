import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ApiResponseInterceptor, ApiResponseService } from '@a3s-lab/http';

export * from '@a3s-lab/http';

@Global()
@Module({
    providers: [ApiResponseService, { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor }],
    exports: [ApiResponseService],
})
export class ApiResponseModule {}
