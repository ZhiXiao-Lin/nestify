import { INotification, INotificationMessage, MetadataExplorer } from '@nestify/core';
import { Inject, Injectable, Type } from '@nestjs/common';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { EventEmitter } from 'events';
import { NOTIFICATION_ACTION, NOTIFICATION_NOTIFIABLE, NOTIFICATION_OPTIONS } from './notification.constants';
import { NotificationModuleOptions } from './notification.interfaces';

@Injectable()
export class NotificationService implements INotification {
    private readonly event: EventEmitter;

    constructor(
        @Inject(NOTIFICATION_OPTIONS)
        private readonly options: NotificationModuleOptions,
        private readonly modulesContainer: ModulesContainer,
        private readonly reflector: Reflector
    ) {
        this.event = this.options.event;
        this.explore();
    }

    async notify(message: INotificationMessage): Promise<boolean> {
        return this.event.emit(`${message.type}-${message.action}`, message.context);
    }

    private explore() {
        const components = MetadataExplorer.getComponents([...(this.modulesContainer.values() as any)]);

        components
            .filter(({ metatype }) => this.isNotifiable(metatype))
            .forEach(({ instance, metatype }) => {
                const type = this.getNotifiableMetadata(metatype);
                MetadataExplorer.getProperties(instance).forEach((key) => {
                    if (this.isAction(instance[key])) {
                        const action = this.getActionMetadata(instance[key]);
                        this.event.on(`${type}-${action}`, instance[key].bind(instance));
                    }
                });
            });
    }

    private isNotifiable(target: Type<any> | Function): boolean {
        return !!this.reflector.get(NOTIFICATION_NOTIFIABLE, target);
    }

    private isAction(target: Type<any> | Function): boolean {
        return !!this.reflector.get(NOTIFICATION_ACTION, target);
    }

    private getNotifiableMetadata(target: Type<any> | Function): any {
        return this.reflector.get(NOTIFICATION_NOTIFIABLE, target);
    }

    private getActionMetadata(target: Type<any> | Function): any {
        return this.reflector.get(NOTIFICATION_ACTION, target);
    }
}
