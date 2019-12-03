import { Inject } from '@nestjs/common';
import { CONFIG_SERVICE, EVENT_PUBLISHER, LOGGER_SERVICE } from './constants';

export const InjectConfig = () => Inject(CONFIG_SERVICE);
export const InjectLogger = () => Inject(LOGGER_SERVICE);
export const InjectEventPublisher = () => Inject(EVENT_PUBLISHER);
