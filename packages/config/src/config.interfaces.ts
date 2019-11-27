export interface IConfigService {
    get(param: string | string[], value?: any): any;

    has(param: string | string[]): boolean;
}
