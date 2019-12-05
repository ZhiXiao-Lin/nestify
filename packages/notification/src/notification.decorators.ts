import { SetMetadata } from '@nestjs/common';
import { NOTIFICATION_ACTION, NOTIFICATION_NOTIFIABLE } from './notification.constants';

export const Notifiable = (type: string): ClassDecorator => SetMetadata(NOTIFICATION_NOTIFIABLE, type);

export const Action = (name: string): MethodDecorator => SetMetadata(NOTIFICATION_ACTION, name);
