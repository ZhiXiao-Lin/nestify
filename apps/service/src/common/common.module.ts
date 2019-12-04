import { ConfigModule } from '@nestify/config';
import { IConfigService } from '@nestify/core';
import { EventBusModule } from '@nestify/event-bus';
import { LoggerModule } from '@nestify/logger';
import { CacheModule, Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitter } from 'events';
import * as path from 'path';
import { CONFIG_SERVICE } from './constants';
import { CoreModule } from './core';
import { CacheProvider, ConfigProvider, EventPublisherProvider, LoggerProvider } from './providers';

ConfigModule.initEnvironment(process.cwd() + '/src/env');
const event = new EventEmitter();

@Global()
@Module({
    imports: [
        ConfigModule.register(path.resolve(process.cwd(), 'dist/config', '**/!(*.d).js')),
        CacheModule.registerAsync({
            useFactory: (config: IConfigService) => config.get('cache'),
            inject: [CONFIG_SERVICE]
        }),
        LoggerModule.registerAsync({
            useFactory: (config: IConfigService) => config.get('logger'),
            inject: [CONFIG_SERVICE]
        }),
        EventBusModule.register({ event }),
        MongooseModule.forRootAsync({
            useFactory: (config: IConfigService) => config.get('mongo.connection'),
            inject: [CONFIG_SERVICE]
        }),
        CoreModule
    ],
    providers: [ConfigProvider, CacheProvider, LoggerProvider, EventPublisherProvider],
    exports: [ConfigProvider, CacheProvider, LoggerProvider, EventPublisherProvider]
})
export class CommonModule {}
