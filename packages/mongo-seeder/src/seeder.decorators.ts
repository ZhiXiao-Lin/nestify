import { SCOPE_OPTIONS_METADATA } from '@nestjs/common/constants';
import { SEEDER } from './seeder.constants';
import { SeederDecorator } from './seeder.interfaces';

export const Seeder = (options: SeederDecorator = {}) => {
    return (target: object) => {
        Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, options.injectableOptions, target);
        Reflect.defineMetadata(SEEDER, options, target);
    };
};
