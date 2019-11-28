import { ConfigModule, ConfigService, IConfigService } from '@nestify/config';
import { LoggerModule } from '@nestify/logger';
import { EventBusModule } from '@nestify/event-bus';
import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import * as path from 'path';
import { ConfigProvider, LoggerProvider } from './providers';
import { EventEmitter } from 'events';

const event = new EventEmitter();
ConfigModule.initEnvironment(process.cwd() + '/src/env');

@Global()
@Module({
    imports: [
        ConfigModule.register(path.resolve(process.cwd(), 'dist/config', '**/!(*.d).js')),
        LoggerModule.registerAsync({
            useFactory: (config: IConfigService) => config.get('logger'),
            inject: [ConfigService]
        }),
        EventBusModule.register({ event }),
        MongooseModule.forRootAsync({
            useFactory: (config: IConfigService) => config.get('mongo.connection'),
            inject: [ConfigService]
        })
    ],
    providers: [ConfigProvider, LoggerProvider],
    exports: [ConfigProvider, LoggerProvider]
})
export class CommonModule { }
