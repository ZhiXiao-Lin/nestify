import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';
import { ConsoleService } from './console.service';

export interface BootstrapConsoleOptions {
    module: any;
    contextOptions?: NestApplicationContextOptions;
    service?: { new (...args: any[]): ConsoleService };
    withContainer?: boolean;
}
