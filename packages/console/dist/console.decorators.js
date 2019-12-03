"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const console_constants_1 = require("./console.constants");
exports.InjectCommander = () => common_1.Inject(console_constants_1.CONSOLE_COMMANDER_PROVIDER);
//# sourceMappingURL=console.decorators.js.map