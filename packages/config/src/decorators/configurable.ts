import 'reflect-metadata';
import { CONFIG_CONFIGURABLE, CONFIG_PARAMS } from '../config.constants';
import { applyParamsMetadataDecorator } from '../utils';
import { ConfigService } from '../config.service';

export const Configurable = (): MethodDecorator => {
    return (target: Object, key: string | symbol, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;
        descriptor.value = function(...args: any[]) {
            const paramsMetadata = (Reflect.getMetadata(CONFIG_PARAMS, target, key) || []).filter((p) => {
                return p.propertyKey === key;
            });
            return originalMethod.apply(this, applyParamsMetadataDecorator(paramsMetadata, args, ConfigService.get));
        };

        Reflect.defineMetadata(CONFIG_CONFIGURABLE, Reflect.getMetadata(CONFIG_PARAMS, target, key) || [], descriptor.value);
        return descriptor;
    };
};
