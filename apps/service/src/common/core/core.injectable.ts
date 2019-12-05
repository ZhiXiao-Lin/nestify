import { ICacheService, IConfigService, IEventPublisher, ILoggerService, INotification } from '@nestify/core';
import { InjectCache, InjectConfig, InjectEventPublisher, InjectLogger, InjectNotification } from '../decorators';

export abstract class BaseInjectable {
    @InjectConfig()
    protected readonly config: IConfigService;

    @InjectCache()
    protected readonly cache: ICacheService;

    @InjectLogger()
    protected readonly logger: ILoggerService;

    @InjectEventPublisher()
    protected readonly event: IEventPublisher;

    @InjectNotification()
    protected readonly notification: INotification;
}
