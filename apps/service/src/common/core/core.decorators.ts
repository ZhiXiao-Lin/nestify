import { SetMetadata } from "@nestjs/common";
import { SCOPE_OPTIONS_METADATA } from "@nestjs/common/constants";
import { REPOSITORY, REPOSITORY_LISTENER } from "./core.constants";
import { RepositoryDecorator } from "./core.interfaces";

export const Repository = (options: RepositoryDecorator = {}) => {
    return (target: object) => {
        Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, options.injectableOptions, target);
        Reflect.defineMetadata(REPOSITORY, options, target);
    };
}

export const BeforeLoad = (): MethodDecorator => SetMetadata(REPOSITORY_LISTENER, { event: 'before-load' });