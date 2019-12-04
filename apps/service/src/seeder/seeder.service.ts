import { MetadataExplorer } from '@nestify/core';
import { Injectable, OnModuleInit, Type } from '@nestjs/common';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { SEEDER } from './seeder.constants';
import { ISeeder } from './seeder.interfaces';

@Injectable()
export class SeederService implements OnModuleInit {
    private seeders: ISeeder[] = [];

    constructor(private readonly modulesContainer: ModulesContainer, private readonly reflector: Reflector) {}

    onModuleInit() {
        this.explore();
    }

    get Seeders() {
        return this.seeders;
    }

    private explore() {
        const components = MetadataExplorer.getComponents([...this.modulesContainer.values()]);
        components
            .filter(({ metatype }: InstanceWrapper) => this.isSeeder(metatype))
            .forEach(({ instance }: InstanceWrapper) => {
                this.seeders.push(instance);
            });

        this.seeders.sort((a, b) => a.sort - b.sort);
    }

    private isSeeder(target: Type<any> | Function): boolean {
        return !!this.reflector.get(SEEDER, target);
    }
}
