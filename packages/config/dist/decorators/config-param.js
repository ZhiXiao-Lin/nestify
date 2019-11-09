"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const config_constants_1 = require("../config.constants");
exports.ConfigParam = (configKey, fallback = undefined) => (target, propertyKey, parameterIndex) => {
    const existingParameters = Reflect.getMetadata(config_constants_1.CONFIG_PARAMS, target, propertyKey) || [];
    existingParameters.push({ parameterIndex, propertyKey, configKey, fallback });
    Reflect.defineMetadata(config_constants_1.CONFIG_PARAMS, existingParameters, target, propertyKey);
    return target;
};
//# sourceMappingURL=config-param.js.map