"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
var ConfigService_1;
const common_1 = require("@nestjs/common");
const assert = require("assert");
const dotenv_1 = require("dotenv");
const glob_1 = require("glob");
const lodash_1 = require("lodash");
const path = require("path");
const proxy_1 = require("./decorators/proxy");
let ConfigService = ConfigService_1 = class ConfigService {
    constructor(config = {}) {
        this.helpers = {};
        this.bindCustomHelpers(config);
        ConfigService_1.config = config;
    }
    static async load(glob, options) {
        const configs = await this.loadConfigAsync(glob, options);
        return new ConfigService_1(configs);
    }
    static loadSync(glob, options) {
        const configs = this.loadConfigSync(glob, options);
        return new ConfigService_1(configs);
    }
    static get(param, value = undefined) {
        const configValue = lodash_1.get(ConfigService_1.config, param);
        if (configValue === undefined) {
            return value;
        }
        return configValue;
    }
    get(param, value = undefined) {
        return ConfigService_1.get(param, value);
    }
    set(param, value = null) {
        return lodash_1.set(ConfigService_1.config, param, value);
    }
    has(param) {
        return lodash_1.get(ConfigService_1.config, param) !== undefined;
    }
    async merge(glob, options) {
        const config = await ConfigService_1.loadConfigAsync(glob, options);
        Object.keys(config).forEach((configName) => {
            ConfigService_1.config[configName] = config[configName];
        });
    }
    mergeSync(glob, options) {
        const config = ConfigService_1.loadConfigSync(glob, options);
        Object.keys(config).forEach((configName) => {
            ConfigService_1.config[configName] = config[configName];
        });
        return this;
    }
    registerHelper(name, fn) {
        this.helpers[name] = fn.bind(this);
        return this;
    }
    static root(dir = '') {
        const rootPath = this.rootPath || this.srcPath || path.resolve(process.cwd());
        return path.resolve(rootPath, dir);
    }
    static src(dir = '') {
        console.log(`\x1b[33m%s\x1b[0m`, `WARNING: Method 'src' has been deprecated. Please use 'root'`);
        return this.root(dir);
    }
    static resolveRootPath(startPath) {
        assert.ok(path.isAbsolute(startPath), 'Start path must be an absolute path.');
        if (!this.rootPath) {
            const root = this.root();
            let workingDir = startPath;
            let parent = path.dirname(startPath);
            while (workingDir !== root && parent !== root && parent !== workingDir) {
                workingDir = parent;
                parent = path.dirname(workingDir);
            }
            this.rootPath = workingDir;
            this.srcPath = workingDir;
        }
        return this;
    }
    static resolveSrcPath(startPath) {
        console.log(`\x1b[33m%s\x1b[0m`, `WARNING: Method 'resolveSrcPath' has been deprecated. Please use 'resolveRootPath'`);
        return this.resolveRootPath(startPath);
    }
    static loadConfigAsync(glob, options) {
        glob = this.root(glob);
        return new Promise((resolve, reject) => {
            new glob_1.Glob(glob, {}, (err, matches) => {
                if (err) {
                    reject(err);
                }
                else {
                    this.loadEnv(options);
                    const configs = this.configGraph(matches, options && options.modifyConfigName);
                    resolve(configs);
                }
            });
        });
    }
    static loadConfigSync(glob, options) {
        glob = this.root(glob);
        const matches = glob_1.sync(glob);
        this.loadEnv(options);
        return this.configGraph(matches, options && options.modifyConfigName);
    }
    static configGraph(configPaths, modifyConfigName) {
        return configPaths.reduce((configs, file) => {
            const module = require(file);
            const config = module.default || module;
            const configName = modifyConfigName ? modifyConfigName(this.getConfigName(file)) : this.getConfigName(file);
            configs[configName] = config;
            return configs;
        }, {});
    }
    bindCustomHelpers(config) {
        return Object.keys(config).reduce((configObj, configName) => {
            if (typeof configObj[configName] === 'function') {
                const helper = configObj[configName].bind(this);
                configObj[configName] = helper;
                this.helpers[`_${configName}`] = helper;
            }
            if (typeof configObj[configName] === 'object' && configObj[configName] !== null) {
                configObj[configName] = this.bindCustomHelpers(configObj[configName]);
            }
            return configObj;
        }, config);
    }
    static getConfigName(file) {
        const ext = path.extname(file);
        return path.basename(file, ext);
    }
    static loadEnv(options) {
        if (options !== false) {
            dotenv_1.config(options || ConfigService_1.defaultDotenvConfig());
        }
    }
    static defaultDotenvConfig() {
        return {
            path: path.join(process.cwd(), '.env')
        };
    }
};
ConfigService = ConfigService_1 = __decorate([
    common_1.Injectable(),
    proxy_1.ProxyProperty('helpers'),
    __metadata("design:paramtypes", [Object])
], ConfigService);
exports.ConfigService = ConfigService;
//# sourceMappingURL=config.service.js.map