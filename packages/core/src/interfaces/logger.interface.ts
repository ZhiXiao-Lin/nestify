export interface ILoggerService {
    error(...messages: any[]): any;
    warn(...messages: any[]): any;
    info(...messages: any[]): any;
    verbose(...messages: any[]): any;
    debug(...messages: any[]): any;
    silly(...messages: any[]): any;
}
