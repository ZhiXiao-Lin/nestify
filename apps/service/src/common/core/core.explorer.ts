import { Injectable as InjectableDecorator, OnModuleInit, Type } from '@nestjs/common';
import { Injectable } from '@nestjs/common/interfaces';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Module } from '@nestjs/core/injector/module';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { REPOSITORY, REPOSITORY_LISTENER } from './core.constants';
import { RepositoryEvents } from './core.enums';
import { BaseInjectable } from './core.injectable';

@InjectableDecorator()
export class CoreExplorer extends BaseInjectable implements OnModuleInit {
    constructor(private readonly modulesContainer: ModulesContainer, private readonly reflector: Reflector) {
        super();
    }

    onModuleInit() {
        this.explore();
    }

    public explore() {
        const components = CoreExplorer.getComponents([...this.modulesContainer.values()]);

        components.map((wrapper: InstanceWrapper) => {
            const { name, instance } = wrapper;

            this.logger.debug(`Start scanning ${name}...`);

            new MetadataScanner().scanFromPrototype(instance, Object.getPrototypeOf(instance), (key: string) => {
                if (CoreExplorer.isListener(instance[key], this.reflector)) {
                    this.handleListener(wrapper, key, CoreExplorer.getListenerMetadata(instance[key]));
                }
            });

            this.logger.debug(`${name} scanned`);
        });
    }

    private static getComponents(modules: Module[]): InstanceWrapper<Injectable>[] {
        return modules
            .map((module: Module) => module.components)
            .reduce((acc, map) => {
                acc.push(...map.values());
                return acc;
            }, [])
            .filter((wrapper: InstanceWrapper) => wrapper.metatype && CoreExplorer.isRepository(wrapper.metatype));
    }

    private static isRepository(target: Type<any> | Function, reflector: Reflector = new Reflector()): boolean {
        return !!reflector.get(REPOSITORY, target);
    }

    private static isListener(target: Type<any> | Function, reflector: Reflector = new Reflector()): boolean {
        return !!reflector.get(REPOSITORY_LISTENER, target);
    }

    private handleListener({ instance }: InstanceWrapper, key: string, event: RepositoryEvents) {
        this.logger.debug(`${event}_${instance.model.modelName} event has been bound to method ${key}`);
        return this.event.subscribe(`${event}_${instance.model.modelName}`, instance[key].bind(instance));
    }

    private static getListenerMetadata(target: Type<any> | Function, reflector: Reflector = new Reflector()): any {
        return reflector.get(REPOSITORY_LISTENER, target);
    }
}
