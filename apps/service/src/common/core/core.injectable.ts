import { IConfigService, IEventPublisher, ILoggerService } from '@nestify/core';
import { InjectConfig, InjectEventPublisher, InjectLogger } from '../decorators';

export abstract class BaseInjectable {
    @InjectConfig()
    protected readonly config: IConfigService;

    @InjectLogger()
    protected readonly logger: ILoggerService;

    @InjectEventPublisher()
    protected readonly event: IEventPublisher;
}
