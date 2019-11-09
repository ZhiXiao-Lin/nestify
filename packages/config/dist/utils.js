"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_service_1 = require("./config.service");
function applyParamsMetadataDecorator(paramsMetadata, args, fn) {
    if (paramsMetadata.length) {
        for (const param of paramsMetadata) {
            if (Object.keys(param).includes('configKey')) {
                const i = param.parameterIndex;
                if (args[i] instanceof config_service_1.ConfigService || args[i] === config_service_1.ConfigService) {
                    args[param.parameterIndex] = args[i].get(param.configKey, param.fallback);
                }
                else if (args[i] === undefined) {
                    args[param.parameterIndex] = fn(param.configKey, param.fallback);
                }
            }
        }
    }
    return args;
}
exports.applyParamsMetadataDecorator = applyParamsMetadataDecorator;
//# sourceMappingURL=utils.js.map