import { ListenerDecoratorOptions } from '@nestify/event-bus';
import { Injectable as InjectableDecorator, OnModuleInit, Type } from '@nestjs/common';
import { Injectable } from '@nestjs/common/interfaces';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Module } from '@nestjs/core/injector/module';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { REPOSITORY } from './core.constants';
import { BaseInjectable } from './core.injectable';

@InjectableDecorator()
export class CoreExplorer extends BaseInjectable implements OnModuleInit {

    constructor(
        private readonly modulesContainer: ModulesContainer
    ) {
        super();
    }

    onModuleInit() {
        this.explore();
    }

    public explore() {
        this.logger.debug('before explore');
        const components = CoreExplorer.getComponents([...this.modulesContainer.values()]);

        this.logger.debug(`Found ${components.length} components`);

        components.map((wrapper: InstanceWrapper) => {
            const { instance } = wrapper;

            this.logger.debug(`scanning ${wrapper.name}`);

            new MetadataScanner().scanFromPrototype(instance, Object.getPrototypeOf(instance), (key: string) => {
                // if (CoreExplorer.isListener(instance[key], this.reflector)) {
                //     this.handleListener(wrapper, key, CoreExplorer.getListenerMetadata(instance[key], this.reflector));
                // }
            });
        });
        this.logger.debug('after explore');
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
        return !!reflector.get(REPOSITORY, target);
    }

    // private handleListener({ instance }: InstanceWrapper, key: string, options: ListenerDecoratorOptions) {
    //     return this.event.on(options.event, instance[key].bind(instance));
    // }
}