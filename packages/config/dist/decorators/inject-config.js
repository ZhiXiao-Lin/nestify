"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const config_service_1 = require("../config.service");
exports.InjectConfig = () => common_1.Inject(config_service_1.ConfigService);
//# sourceMappingURL=inject-config.js.map