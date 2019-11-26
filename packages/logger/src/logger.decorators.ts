import { Inject } from '@nestjs/common';
import { LOGGER_MODULE_PROVIDER } from './logger.constants';
import { LoggerService } from './logger.service';

export const InjectLoggerProvider = () => Inject(LOGGER_MODULE_PROVIDER);
export const InjectLogger = () => Inject(LoggerService);
