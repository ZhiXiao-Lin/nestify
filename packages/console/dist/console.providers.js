"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const console_constants_1 = require("./console.constants");
exports.CommanderProvider = {
    provide: console_constants_1.CONSOLE_COMMANDER_PROVIDER,
    useValue: new commander_1.Command()
};
//# sourceMappingURL=console.providers.js.map