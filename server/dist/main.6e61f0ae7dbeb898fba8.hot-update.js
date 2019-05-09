exports.id = "main";
exports.modules = {

/***/ "./src/app.module.ts":
/*!***************************!*\
  !*** ./src/app.module.ts ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nvar __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {\r\n    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;\r\n    if (typeof Reflect === \"object\" && typeof Reflect.decorate === \"function\") r = Reflect.decorate(decorators, target, key, desc);\r\n    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;\r\n    return c > 3 && r && Object.defineProperty(target, key, r), r;\r\n};\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nconst common_1 = __webpack_require__(/*! @nestjs/common */ \"@nestjs/common\");\r\nconst app_controller_1 = __webpack_require__(/*! ./app.controller */ \"./src/app.controller.ts\");\r\nconst common_module_1 = __webpack_require__(/*! ./common/common.module */ \"./src/common/common.module.ts\");\r\nconst api_module_1 = __webpack_require__(/*! ./api/api.module */ \"./src/api/api.module.ts\");\r\nconst seed_1 = __webpack_require__(/*! ./seed */ \"./src/seed/index.ts\");\r\nlet AppModule = class AppModule {\r\n};\r\nAppModule = __decorate([\r\n    common_1.Module({\r\n        imports: [common_module_1.CommonModule, api_module_1.ApiModule],\r\n        controllers: [app_controller_1.AppController],\r\n        providers: [seed_1.Seed]\r\n    })\r\n], AppModule);\r\nexports.AppModule = AppModule;\r\n\n\n//# sourceURL=webpack:///./src/app.module.ts?");

/***/ }),

/***/ "./src/common/common.module.ts":
/*!*************************************!*\
  !*** ./src/common/common.module.ts ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\r\nvar __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {\r\n    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;\r\n    if (typeof Reflect === \"object\" && typeof Reflect.decorate === \"function\") r = Reflect.decorate(decorators, target, key, desc);\r\n    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;\r\n    return c > 3 && r && Object.defineProperty(target, key, r), r;\r\n};\r\nObject.defineProperty(exports, \"__esModule\", { value: true });\r\nconst common_1 = __webpack_require__(/*! @nestjs/common */ \"@nestjs/common\");\r\nconst passport_1 = __webpack_require__(/*! @nestjs/passport */ \"@nestjs/passport\");\r\nconst jwt_1 = __webpack_require__(/*! @nestjs/jwt */ \"@nestjs/jwt\");\r\nconst typeorm_1 = __webpack_require__(/*! @nestjs/typeorm */ \"@nestjs/typeorm\");\r\nconst config_1 = __webpack_require__(/*! ../config */ \"./src/config/index.ts\");\r\nconst user_service_1 = __webpack_require__(/*! ./services/user.service */ \"./src/common/services/user.service.ts\");\r\nconst jwt_strategy_1 = __webpack_require__(/*! ./strategys/jwt.strategy */ \"./src/common/strategys/jwt.strategy.ts\");\r\nlet CommonModule = class CommonModule {\r\n};\r\nCommonModule = __decorate([\r\n    common_1.Global(),\r\n    common_1.Module({\r\n        imports: [\r\n            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),\r\n            jwt_1.JwtModule.register(config_1.config.jwt),\r\n            typeorm_1.TypeOrmModule.forRoot(config_1.config.orm)\r\n        ],\r\n        providers: [jwt_strategy_1.JwtStrategy, user_service_1.UserService],\r\n        exports: [user_service_1.UserService]\r\n    })\r\n], CommonModule);\r\nexports.CommonModule = CommonModule;\r\n\n\n//# sourceURL=webpack:///./src/common/common.module.ts?");

/***/ })

};