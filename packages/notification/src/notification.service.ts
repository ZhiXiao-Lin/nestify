import { INotification, INotificationMessage, MetadataExplorer } from '@nestify/core';
import { Injectable, OnModuleInit, Type } from '@nestjs/common';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { NOTIFICATION_ACTION, NOTIFICATION_NOTIFIABLE } from './notification.constants';

@Injectable()
export class NotificationService implements INotification, OnModuleInit {
    private readonly notifiables: Map<string, Function> = new Map<string, Function>();

    constructor(private readonly modulesContainer: ModulesContainer, private readonly reflector: Reflector) {}

    onModuleInit() {
        this.explore();
    }

    async notify(message: INotificationMessage): Promise<boolean> {
        const action = this.notifiables.get(`${message.type}-${message.action}`);

        if (!action) throw new Error(`${message.type}-${message.action} does not exist.`);

        return await action(message.context);
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
                        this.notifiables.set(`${type}-${action}`, instance[key].bind(instance));
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
