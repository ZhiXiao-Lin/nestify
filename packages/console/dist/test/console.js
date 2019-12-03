"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const console_module_1 = require("../console.module");
const module_1 = require("./module");
console_module_1.ConsoleModule.bootstrap({ module: module_1.ConsoleModuleTest })
    .then(({ app, boot }) => {
    boot();
})
    .catch((err) => console.error(err));
//# sourceMappingURL=console.js.map