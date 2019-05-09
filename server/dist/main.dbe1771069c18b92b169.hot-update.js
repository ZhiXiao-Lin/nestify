exports.id = "main";
exports.modules = {

/***/ "./src/common/common.module.ts":
/*!*************************************!*\
  !*** ./src/common/common.module.ts ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nvar __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {\r\n    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;\r\n    if (typeof Reflect === \"object\" && typeof Reflect.decorate === \"function\") r = Reflect.decorate(decorators, target, key, desc);\r\n    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;\r\n    return c > 3 && r && Object.defineProperty(target, key, r), r;\r\n};\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nconst common_1 = __webpack_require__(/*! @nestjs/common */ \"@nestjs/common\");\r\nconst passport_1 = __webpack_require__(/*! @nestjs/passport */ \"@nestjs/passport\");\r\nconst jwt_1 = __webpack_require__(/*! @nestjs/jwt */ \"@nestjs/jwt\");\r\nconst config_1 = __webpack_require__(/*! ../config */ \"./src/config/index.ts\");\r\nconst user_service_1 = __webpack_require__(/*! ./services/user.service */ \"./src/common/services/user.service.ts\");\r\nconst jwt_strategy_1 = __webpack_require__(/*! ./strategys/jwt.strategy */ \"./src/common/strategys/jwt.strategy.ts\");\r\nlet CommonModule = class CommonModule {\r\n};\r\nCommonModule = __decorate([\r\n    common_1.Global(),\r\n    common_1.Module({\r\n        imports: [\r\n            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),\r\n            jwt_1.JwtModule.register(config_1.config.jwt)\r\n        ],\r\n        providers: [jwt_strategy_1.JwtStrategy, user_service_1.UserService],\r\n        exports: [user_service_1.UserService]\r\n    })\r\n], CommonModule);\r\nexports.CommonModule = CommonModule;\r\n\n\n//# sourceURL=webpack:///./src/common/common.module.ts?");

/***/ })

};