import { Type } from '@nestjs/common';
import { Injectable } from '@nestjs/common/interfaces';
import { ModulesContainer } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Module } from '@nestjs/core/injector/module';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';

export type ComponentValidation = (target: Type<any> | Function) => boolean;

export class MetadataExplorer {
    constructor(
        private readonly modulesContainer: ModulesContainer
    ) { }

    public explore(isComponent: ComponentValidation) {
        return MetadataExplorer.getComponents([...this.modulesContainer.values()], isComponent);
    }

    public static getProperties(target: any) {
        const properties = [];
        new MetadataScanner().scanFromPrototype(target, Object.getPrototypeOf(target), (key: string) => {
            properties.push(key);
        });

        return properties;
    }

    public static getComponents(modules: Module[], isComponent: ComponentValidation): InstanceWrapper<Injectable>[] {
        return modules
            .map((module: Module) => module.components)
            .reduce((acc, map) => {
                acc.push(...map.values());
                return acc;
            }, [])
            .filter((wrapper: InstanceWrapper) => wrapper.metatype && isComponent(wrapper.metatype));
    }
}
