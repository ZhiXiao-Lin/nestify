import { ConfigService } from '@nestify/config';
import { CryptService } from '@nestify/crypt';
import { EventBusService } from '@nestify/event-bus';
import { LoggerService } from '@nestify/logger';
import { CACHE_MANAGER } from '@nestjs/common';
import { CACHE_SERVICE, CONFIG_SERVICE, CRYPT_SERVICE, EVENT_PUBLISHER, LOGGER_SERVICE } from './constants';

export const ConfigProvider = {
    provide: CONFIG_SERVICE,
    useExisting: ConfigService
};

export const CacheProvider = {
    provide: CACHE_SERVICE,
    useExisting: CACHE_MANAGER
};

export const LoggerProvider = {
    provide: LOGGER_SERVICE,
    useExisting: LoggerService
};

export const EventPublisherProvider = {
    provide: EVENT_PUBLISHER,
    useExisting: EventBusService
};

export const CryptProvider = {
    provide: CRYPT_SERVICE,
    useExisting: CryptService
};
