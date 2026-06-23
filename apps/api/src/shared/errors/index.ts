import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GlobalErrorFilter } from '@a3s-lab/http';

export * from '@a3s-lab/http';
export * from './error-codes';

@Global()
@Module({
    providers: [{ provide: APP_FILTER, useClass: GlobalErrorFilter }],
})
export class ErrorsModule {}
