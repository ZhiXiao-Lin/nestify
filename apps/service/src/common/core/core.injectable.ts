import { ICacheService, IConfigService, IEventPublisher, ILoggerService } from '@nestify/core';
import { InjectCache, InjectConfig, InjectEventPublisher, InjectLogger } from '../decorators';

export abstract class BaseInjectable {
    @InjectConfig()
    protected readonly config: IConfigService;

    @InjectCache()
    protected readonly cache: ICacheService;

    @InjectLogger()
    protected readonly logger: ILoggerService;

    @InjectEventPublisher()
    protected readonly event: IEventPublisher;
}
