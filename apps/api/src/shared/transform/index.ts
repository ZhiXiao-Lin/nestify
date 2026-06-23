import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TransformInterceptor } from './transform.interceptor';

export {
    TransformInterceptor,
    KeyTransformInterceptor,
    transformKeysToCamelCase,
    transformKeysToSnakeCase,
} from './transform.interceptor';
export type { TransformOptions, ResponseMetadata } from './transform.interceptor';

@Module({
    providers: [{ provide: APP_INTERCEPTOR, useClass: TransformInterceptor }],
})
export class TransformModule {}
