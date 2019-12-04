import { ModuleMetadata } from '@nestjs/common/interfaces';

export type CryptModuleOptions = {
    salt: string;
};

export interface CryptModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useFactory: (...args: any[]) => Promise<CryptModuleOptions> | CryptModuleOptions;
    inject?: any[];
}
