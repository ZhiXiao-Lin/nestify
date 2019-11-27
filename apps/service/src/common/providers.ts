import { ConfigService } from '@nestify/config';
import { LoggerService } from '@nestify/logger';
import { CONFIG_SERVICE, LOGGER_SERVICE } from './constants';

export const ConfigProvider = {
    provide: CONFIG_SERVICE,
    useExisting: ConfigService
};

export const LoggerProvider = {
    provide: LOGGER_SERVICE,
    useExisting: LoggerService
};
