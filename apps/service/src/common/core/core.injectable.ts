import { IConfigService, ILoggerService } from '@nestify/core';
import { InjectConfig, InjectLogger } from '../decorators';

export abstract class BaseInjectable {
    @InjectConfig()
    protected readonly config: IConfigService;

    @InjectLogger()
    protected readonly logger: ILoggerService;
}
