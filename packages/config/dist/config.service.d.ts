import { DotenvConfigOptions } from 'dotenv';
export interface ModuleConfig {
    [key: string]: any;
}
export interface Config {
    [key: string]: ModuleConfig;
}
export declare type CustomHelper = {
    [key: string]: (...args: any[]) => any;
};
export interface ConfigOptions extends Partial<DotenvConfigOptions> {
    modifyConfigName?: (name: string) => string;
}
export declare class ConfigService {
    [key: string]: Config | CustomHelper | ((...args: any[]) => any) | any;
    private static config;
    private readonly helpers;
    static rootPath?: string;
    static srcPath?: string;
    constructor(config?: Config);
    static load(glob: string, options?: ConfigOptions | false): Promise<ConfigService>;
    static loadSync(glob: string, options?: ConfigOptions | false): ConfigService;
    static get(param: string | string[], value?: any): any;
    get(param: string | string[], value?: any): any;
    set(param: string | string[], value?: any): Config;
    has(param: string | string[]): boolean;
    merge(glob: string, options?: ConfigOptions): Promise<void>;
    mergeSync(glob: string, options?: ConfigOptions): ConfigService;
    registerHelper(name: string, fn: (...args: any[]) => any): ConfigService;
    static root(dir?: string): string;
    static src(dir?: string): string;
    static resolveRootPath(startPath: string): typeof ConfigService;
    static resolveSrcPath(startPath: string): typeof ConfigService;
    protected static loadConfigAsync(glob: string, options?: ConfigOptions | false): Promise<Config>;
    protected static loadConfigSync(glob: string, options?: ConfigOptions | false): Config;
    protected static configGraph(configPaths: string[], modifyConfigName?: (name: string) => string): {};
    protected bindCustomHelpers(config: any): any;
    protected static getConfigName(file: string): string;
    protected static loadEnv(options?: DotenvConfigOptions | false): void;
    protected static defaultDotenvConfig(): {
        path: string;
    };
}
