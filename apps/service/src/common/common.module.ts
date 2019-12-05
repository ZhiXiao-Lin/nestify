import { ConfigModule } from '@nestify/config';
import { IConfigService } from '@nestify/core';
import { CryptModule } from '@nestify/crypt';
import { EventBusModule } from '@nestify/event-bus';
import { LoggerModule } from '@nestify/logger';
import { NotificationModule } from '@nestify/notification';
import { CacheModule, Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitter } from 'events';
import * as path from 'path';
import { CONFIG_SERVICE } from './constants';
import { CoreModule } from './core';
import { CacheProvider, ConfigProvider, CryptProvider, EventPublisherProvider, LoggerProvider, NotificationProvider } from './providers';

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
        CryptModule.registerAsync({
            useFactory: (config: IConfigService) => config.get('crypt'),
            inject: [CONFIG_SERVICE]
        }),
        NotificationModule,
        CoreModule
    ],
    providers: [ConfigProvider, CacheProvider, LoggerProvider, EventPublisherProvider, CryptProvider, NotificationProvider],
    exports: [
        CacheModule,
        NotificationModule,
        ConfigProvider,
        CacheProvider,
        LoggerProvider,
        EventPublisherProvider,
        CryptProvider,
        NotificationProvider
    ]
})
export class CommonModule { }
