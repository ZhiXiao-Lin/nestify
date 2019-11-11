import { Inject } from '@nestjs/common';
import { LOGGER_MODULE_PROVIDER } from './logger.constants';

export const InjectLogger = (): ParameterDecorator => Inject(LOGGER_MODULE_PROVIDER);
