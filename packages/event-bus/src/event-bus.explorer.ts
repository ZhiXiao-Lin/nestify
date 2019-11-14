import { Injectable, Type } from '@nestjs/common/interfaces';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Module } from '@nestjs/core/injector/module';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { EVENT_BUS_LISTENER, EVENT_BUS_SUBSCRIBER } from './event-bus.constants';
import { ListenerDecoratorOptions } from './event-bus.interfaces';

export class EventBusExplorer {
    constructor(
        private readonly modulesContainer: ModulesContainer,
        private readonly reflector: Reflector,
        private readonly handleListener: (wrapper: InstanceWrapper, key: string, options: ListenerDecoratorOptions) => void
    ) {}

    public explore() {
        const components = EventBusExplorer.getComponents([...this.modulesContainer.values()]);

        components.map((wrapper: InstanceWrapper) => {
            const { instance } = wrapper;

            new MetadataScanner().scanFromPrototype(instance, Object.getPrototypeOf(instance), (key: string) => {
                if (EventBusExplorer.isListener(instance[key], this.reflector)) {
                    this.handleListener(wrapper, key, EventBusExplorer.getListenerMetadata(instance[key], this.reflector));
                }
            });
        });
    }

    private static getComponents(modules: Module[]): InstanceWrapper<Injectable>[] {
        return modules
            .map((module: Module) => module.components)
            .reduce((acc, map) => {
                acc.push(...map.values());
                return acc;
            }, [])
            .filter((wrapper: InstanceWrapper) => wrapper.metatype && EventBusExplorer.isSubscriber(wrapper.metatype));
    }

    private static isSubscriber(target: Type<any> | Function, reflector: Reflector = new Reflector()): boolean {
        return !!reflector.get(EVENT_BUS_SUBSCRIBER, target);
    }

    private static isListener(target: Type<any> | Function, reflector: Reflector = new Reflector()): boolean {
        return !!reflector.get(EVENT_BUS_LISTENER, target);
    }

    private static getListenerMetadata(target: Type<any> | Function, reflector: Reflector = new Reflector()): any {
        return reflector.get(EVENT_BUS_LISTENER, target);
    }
}
