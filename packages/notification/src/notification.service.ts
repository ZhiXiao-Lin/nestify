import { INotification, INotificationMessage, MetadataExplorer } from '@nestify/core';
import { Injectable, Type } from '@nestjs/common';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { NOTIFICATION_ACTION, NOTIFICATION_NOTIFIABLE } from './notification.constants';
import { Action } from './notification.interfaces';

@Injectable()
export class NotificationService implements INotification {
    private readonly notifiables: Map<string, Action> = new Map<string, Action>();

    constructor(private readonly modulesContainer: ModulesContainer, private readonly reflector: Reflector) {
        this.explore();
    }

    async notify(message: INotificationMessage): Promise<boolean> {
        const action = this.notifiables.get(`${message.type}-${message.action}`);

        if (!action) throw new Error(`${message.type}-${message.action} does not exist.`);

        return await action(message.context);
    }

    private explore() {
        const components = MetadataExplorer.getComponents([...this.modulesContainer.values()]);

        components
            .filter(({ metatype }: InstanceWrapper) => this.isNotifiable(metatype))
            .forEach(({ instance, metatype }: InstanceWrapper) => {
                const type = this.getNotifiableMetadata(metatype);
                MetadataExplorer.getProperties(instance).forEach((key) => {
                    if (this.isAction(instance[key])) {
                        const action = this.getActionMetadata(instance[key]);
                        this.notifiables.set(`${type}-${action}`, instance[key].bind(this));
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
