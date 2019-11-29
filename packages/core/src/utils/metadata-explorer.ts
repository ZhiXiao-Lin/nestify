import { Injectable } from '@nestjs/common/interfaces';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Module } from '@nestjs/core/injector/module';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';

export class MetadataExplorer {
    public static getComponents(modules: Module[]): InstanceWrapper<Injectable>[] {
        return modules
            .map((module: Module) => module.components)
            .reduce((acc, map) => {
                acc.push(...map.values());
                return acc;
            }, [])
            .filter((wrapper: InstanceWrapper) => !!wrapper.metatype);
    }

    public static getProperties(target: any) {
        const properties = [];
        new MetadataScanner().scanFromPrototype(target, Object.getPrototypeOf(target), (key: string) => {
            properties.push(key);
        });

        return properties;
    }
}
