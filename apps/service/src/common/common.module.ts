import { ConfigModule, ConfigService, IConfigService } from "@nestify/config";
import { LoggerModule } from "@nestify/logger";
import { Module } from "@nestjs/common";
import * as path from 'path';
import { ConfigProvider, LoggerProvider } from "./providers";

@Module({
    imports: [
        ConfigModule.register(path.resolve(process.cwd(), 'src/config', '**/!(*.d).js')),
        LoggerModule.registerAsync({
            useFactory: (config: IConfigService) => config.get('logger'),
            inject: [ConfigService]
        })
    ],
    providers: [
        ConfigProvider,
        LoggerProvider
    ],
    exports: [
        ConfigProvider,
        LoggerProvider
    ]
})
export class CommonModule { }