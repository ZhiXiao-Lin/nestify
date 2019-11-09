import { DynamicModule, Global, Logger, Module } from '@nestjs/common';
import { config as dotenv } from 'dotenv';
import * as path from 'path';
import { ConfigOptions, ConfigService } from './config.service';

@Global()
@Module({
    providers: [ConfigService],
    exports: [ConfigService]
})
export class ConfigModule {
    static initEnvironment(env: string = process.env.NODE_ENV || 'development') {
        const envPath = path.resolve(__dirname, 'env', !env ? '.env' : `.env.${env}`);
        dotenv({ path: envPath });

        Logger.log(`Loading environment variables from ${envPath}`, ConfigModule.name);
    }

    /**
     * @param startPath
     * @deprecated
     */
    static resolveSrcPath(startPath: string): typeof ConfigModule {
        ConfigService.resolveSrcPath(startPath);
        return this;
    }

    /**
     * @param path
     */
    public static resolveRootPath(path: string): typeof ConfigModule {
        ConfigService.resolveRootPath(path);
        return this;
    }

    /**
     * From Glob
     * @param glob
     * @param {ConfigOptions} options
     * @returns {DynamicModule}
     */
    static register(glob: string, options?: ConfigOptions): DynamicModule {
        const configProvider = {
            provide: ConfigService,
            useFactory: async (): Promise<ConfigService> => {
                return ConfigService.load(glob, options);
            }
        };
        return {
            module: ConfigModule,
            providers: [configProvider],
            exports: [configProvider]
        };
    }
}
