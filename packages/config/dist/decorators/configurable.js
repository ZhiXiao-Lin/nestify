"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const config_constants_1 = require("../config.constants");
const utils_1 = require("../utils");
const config_service_1 = require("../config.service");
exports.Configurable = () => {
    return (target, key, descriptor) => {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args) {
            const paramsMetadata = (Reflect.getMetadata(config_constants_1.CONFIG_PARAMS, target, key) || []).filter((p) => {
                return p.propertyKey === key;
            });
            return originalMethod.apply(this, utils_1.applyParamsMetadataDecorator(paramsMetadata, args, config_service_1.ConfigService.get));
        };
        Reflect.defineMetadata(config_constants_1.CONFIG_CONFIGURABLE, Reflect.getMetadata(config_constants_1.CONFIG_PARAMS, target, key) || [], descriptor.value);
        return descriptor;
    };
};
//# sourceMappingURL=configurable.js.map