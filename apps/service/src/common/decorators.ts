import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { CONFIG_SERVICE, CRYPT_SERVICE, EVENT_PUBLISHER, LOGGER_SERVICE, NOTIFICATION_SERVICE } from './constants';

export const InjectConfig = () => Inject(CONFIG_SERVICE);
export const InjectCache = () => Inject(CACHE_MANAGER);
export const InjectCrypt = () => Inject(CRYPT_SERVICE);
export const InjectLogger = () => Inject(LOGGER_SERVICE);
export const InjectEventPublisher = () => Inject(EVENT_PUBLISHER);
export const InjectNotification = () => Inject(NOTIFICATION_SERVICE);
