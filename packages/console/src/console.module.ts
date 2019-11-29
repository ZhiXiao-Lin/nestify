import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { BootstrapConsoleOptions } from './console.interfaces';
import { CommanderProvider } from './console.providers';
import { ConsoleService } from './console.service';

@Module({
    providers: [CommanderProvider, ConsoleService],
    exports: [CommanderProvider, ConsoleService]
})
export class ConsoleModule {
    static async bootstrap(options: BootstrapConsoleOptions) {
        const config = {
            contextOptions: { logger: false },
            service: ConsoleService,
            ...options
        };

        const app = await this.createAppContext(config);
        const service = app.get(ConsoleService);

        return {
            app,
            boot(argv?: string[]) {
                return service.init(!argv ? process.argv : argv);
            }
        };
    }

    static createAppContext(options: BootstrapConsoleOptions) {
        return NestFactory.createApplicationContext(options.module, options.contextOptions);
    }
}
