"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const console_providers_1 = require("./console.providers");
const console_service_1 = require("./console.service");
let ConsoleModule = class ConsoleModule {
    static async bootstrap(options) {
        const config = Object.assign({ contextOptions: { logger: false }, service: console_service_1.ConsoleService }, options);
        const app = await this.createAppContext(config);
        const service = app.get(console_service_1.ConsoleService);
        return {
            app,
            boot(argv) {
                return service.init(!argv ? process.argv : argv);
            }
        };
    }
    static createAppContext(options) {
        return core_1.NestFactory.createApplicationContext(options.module, options.contextOptions);
    }
};
ConsoleModule = __decorate([
    common_1.Module({
        providers: [console_providers_1.CommanderProvider, console_service_1.ConsoleService],
        exports: [console_providers_1.CommanderProvider, console_service_1.ConsoleService]
    })
], ConsoleModule);
exports.ConsoleModule = ConsoleModule;
//# sourceMappingURL=console.module.js.map