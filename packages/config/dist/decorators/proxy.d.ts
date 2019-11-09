export declare const ProxyProperty: (propertyName: string) => <T extends new (...args: any[]) => {}>(constructor: T) => {
    new (...args: any[]): {};
} & T;
