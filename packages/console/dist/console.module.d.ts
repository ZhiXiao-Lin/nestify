import { BootstrapConsoleOptions } from './console.interfaces';
export declare class ConsoleModule {
    static bootstrap(
        options: BootstrapConsoleOptions
    ): Promise<{
        app: import('@nestjs/common').INestApplicationContext;
        boot(argv?: string[]): any;
    }>;
    static createAppContext(options: BootstrapConsoleOptions): Promise<import('@nestjs/common').INestApplicationContext>;
}
