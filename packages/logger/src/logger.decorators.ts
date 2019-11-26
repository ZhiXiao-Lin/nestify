import { Inject } from '@nestjs/common';
import { LOGGER_MODULE_PROVIDER, LOGGER_SERVICE } from './logger.constants';

export const InjectLoggerProvider = (): ParameterDecorator => Inject(LOGGER_MODULE_PROVIDER);
export const InjectLogger = (): PropertyDecorator => Inject(LOGGER_SERVICE);
