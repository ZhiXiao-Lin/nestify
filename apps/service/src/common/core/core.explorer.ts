import { MetadataExplorer } from '@nestify/core';
import { Injectable, OnModuleInit, Type } from '@nestjs/common';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { REPOSITORY, REPOSITORY_LISTENER } from './core.constants';
import { RepositoryEvents } from './core.enums';
import { BaseInjectable } from './core.injectable';

@Injectable()
export class CoreExplorer extends BaseInjectable implements OnModuleInit {
    constructor(private readonly modulesContainer: ModulesContainer, private readonly reflector: Reflector) {
        super();
    }

    onModuleInit() {
        this.explore();
    }

    public explore() {
        const components = MetadataExplorer.getComponents([...this.modulesContainer.values()]);

        components
            .filter(({ metatype }: InstanceWrapper) => this.isRepository(metatype))
            .forEach(({ instance, name }: InstanceWrapper) => {
                this.logger.debug(`Start scanning ${name}...`);

                MetadataExplorer.getProperties(instance).forEach((key) => {
                    if (this.isListener(instance[key])) {
                        this.handleListener(instance, key, this.getListenerMetadata(instance[key]));
                    }
                });

                this.logger.debug(`${name} scanned`);
            });
    }

    private isRepository(target: Type<any> | Function): boolean {
        return !!this.reflector.get(REPOSITORY, target);
    }

    private isListener(target: Type<any> | Function): boolean {
        return !!this.reflector.get(REPOSITORY_LISTENER, target);
    }

    private handleListener(instance: any, key: string, event: RepositoryEvents) {
        this.logger.debug(`${event}_${instance.model.modelName} event has been bound to method ${key}`);
        return this.event.subscribe(`${event}_${instance.model.modelName}`, instance[key].bind(instance));
    }

    private getListenerMetadata(target: Type<any> | Function): any {
        return this.reflector.get(REPOSITORY_LISTENER, target);
    }
}
