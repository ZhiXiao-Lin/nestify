import { NestModule, MiddlewareConsumer } from '@nestjs/common';
export declare class ApiModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void;
}
