import { IConfigService } from '@nestify/config';
import { ILoggerService } from '@nestify/logger';
import { InjectConfig, InjectLogger } from '../decorators';

export abstract class BaseInjectable {
    @InjectConfig()
    protected readonly config: IConfigService;

    @InjectLogger()
    protected readonly logger: ILoggerService;
}
