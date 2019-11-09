"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var ConfigModule_1;
const common_1 = require("@nestjs/common");
const dotenv_1 = require("dotenv");
const path = require("path");
const config_service_1 = require("./config.service");
let ConfigModule = ConfigModule_1 = class ConfigModule {
    static initEnvironment(env = process.env.NODE_ENV || 'development') {
        const envPath = path.resolve(__dirname, 'env', !env ? '.env' : `.env.${env}`);
        dotenv_1.config({ path: envPath });
        common_1.Logger.log(`Loading environment variables from ${envPath}`, ConfigModule_1.name);
    }
    static resolveSrcPath(startPath) {
        config_service_1.ConfigService.resolveSrcPath(startPath);
        return this;
    }
    static resolveRootPath(path) {
        config_service_1.ConfigService.resolveRootPath(path);
        return this;
    }
    static register(glob, options) {
        const configProvider = {
            provide: config_service_1.ConfigService,
            useFactory: async () => {
                return config_service_1.ConfigService.load(glob, options);
            }
        };
        return {
            module: ConfigModule_1,
            providers: [configProvider],
            exports: [configProvider]
        };
    }
};
ConfigModule = ConfigModule_1 = __decorate([
    common_1.Global(),
    common_1.Module({
        providers: [config_service_1.ConfigService],
        exports: [config_service_1.ConfigService]
    })
], ConfigModule);
exports.ConfigModule = ConfigModule;
//# sourceMappingURL=config.module.js.map