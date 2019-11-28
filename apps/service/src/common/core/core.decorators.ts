import { SetMetadata } from '@nestjs/common';
import { SCOPE_OPTIONS_METADATA } from '@nestjs/common/constants';
import { REPOSITORY, REPOSITORY_LISTENER } from './core.constants';
import { RepositoryEvents } from './core.enums';
import { RepositoryDecorator } from './core.interfaces';

export const Repository = (options: RepositoryDecorator = {}) => {
    return (target: object) => {
        Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, options.injectableOptions, target);
        Reflect.defineMetadata(REPOSITORY, options, target);
    };
};

export const BeforeLoad = (): MethodDecorator => SetMetadata(REPOSITORY_LISTENER, RepositoryEvents.BEFORE_LOAD);
export const AfterLoad = (): MethodDecorator => SetMetadata(REPOSITORY_LISTENER, RepositoryEvents.AFTER_LOAD);
export const BeforeCreate = (): MethodDecorator => SetMetadata(REPOSITORY_LISTENER, RepositoryEvents.BEFORE_CREATE);
export const AfterCreate = (): MethodDecorator => SetMetadata(REPOSITORY_LISTENER, RepositoryEvents.AFTER_CREATE);
export const BeforeUpdate = (): MethodDecorator => SetMetadata(REPOSITORY_LISTENER, RepositoryEvents.BEFORE_UPDATE);
export const AfterUpdate = (): MethodDecorator => SetMetadata(REPOSITORY_LISTENER, RepositoryEvents.AFTER_UPDATE);
export const BeforeRemove = (): MethodDecorator => SetMetadata(REPOSITORY_LISTENER, RepositoryEvents.BEFORE_REMOVE);
export const AfterRemove = (): MethodDecorator => SetMetadata(REPOSITORY_LISTENER, RepositoryEvents.AFTER_REMOVE);
