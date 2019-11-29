import { Injectable, OnModuleInit, Type } from '@nestjs/common';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { MetadataExplorer } from '../utils';
import { REPOSITORY, REPOSITORY_LISTENER } from './core.constants';
import { RepositoryEvents } from './core.enums';
import { BaseInjectable } from './core.injectable';

@Injectable()
export class CoreExplorer extends BaseInjectable implements OnModuleInit {
    private readonly explorer: MetadataExplorer

    constructor(
        private readonly modulesContainer: ModulesContainer,
        private readonly reflector: Reflector
    ) {
        super();
        this.explorer = new MetadataExplorer(this.modulesContainer);
    }

    async onModuleInit() {
        await this.explore();
    }

    public async explore() {

        const components = await this.explorer.explore(this.isRepository.bind(this));

        components.forEach(({ instance, name }) => {

            this.logger.debug(`Start scanning ${name}...`);

            this.explorer.getProperties(instance).forEach(key => {
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
