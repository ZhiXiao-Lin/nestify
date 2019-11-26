import { ConfigModule, ConfigService } from "@nestify/config";
import { LoggerModule } from "@nestify/logger";
import { Module } from "@nestjs/common";
import * as path from 'path';
import { CONFIG_SERVICE } from "./constants";
import { ConfigProvider, LoggerProvider } from "./providers";

@Module({
    imports: [
        ConfigModule.register(path.resolve(process.cwd(), 'src/config', '**/!(*.d).js')),
        LoggerModule.registerAsync({
            useFactory: (config: ConfigService) => ({}),
            inject: []
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