import { ConfigService } from '@nestify/config';
import { EventBusService } from '@nestify/event-bus';
import { LoggerService } from '@nestify/logger';
import { CONFIG_SERVICE, EVENT_PUBLISHER, LOGGER_SERVICE } from './constants';

export const ConfigProvider = {
    provide: CONFIG_SERVICE,
    useExisting: ConfigService
};

export const LoggerProvider = {
    provide: LOGGER_SERVICE,
    useExisting: LoggerService
};

export const EventPublisherProvider = {
    provide: EVENT_PUBLISHER,
    useExisting: EventBusService
};
