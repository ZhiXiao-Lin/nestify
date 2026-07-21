import { type DynamicModule, type FactoryProvider, Module, type ModuleMetadata, type Provider } from '@nestjs/common';
import { FileUploadInterceptor, SingleFileUploadInterceptor } from './file-upload.interceptor';
import {
    FILE_STORAGE_CLIENT,
    FILE_UPLOAD_OPTIONS,
    FileStorageClient,
    FileUploadOptions,
    FileUploadService,
} from './file-upload.service';

export interface FileUploadModuleOptions extends FileUploadOptions {
    storageClient?: FileStorageClient;
}

export interface FileUploadModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    inject?: FactoryProvider['inject'];
    useFactory: (...args: any[]) => FileUploadModuleOptions | Promise<FileUploadModuleOptions>;
}

@Module({
    providers: [
        FileUploadService,
        FileUploadInterceptor,
        SingleFileUploadInterceptor,
        {
            provide: FILE_UPLOAD_OPTIONS,
            useValue: {},
        },
    ],
    exports: [FileUploadService, FileUploadInterceptor, SingleFileUploadInterceptor],
})
export class FileUploadModule {
    static register(options: FileUploadModuleOptions = {}): DynamicModule {
        const providers: Provider[] = [
            FileUploadService,
            FileUploadInterceptor,
            SingleFileUploadInterceptor,
            {
                provide: FILE_UPLOAD_OPTIONS,
                useValue: options,
            },
        ];

        if (options.storageClient) {
            providers.push({
                provide: FILE_STORAGE_CLIENT,
                useValue: options.storageClient,
            });
        }

        return {
            module: FileUploadModule,
            providers,
            exports: [FileUploadService, FileUploadInterceptor, SingleFileUploadInterceptor],
        };
    }

    static registerAsync(options: FileUploadModuleAsyncOptions): DynamicModule {
        return {
            module: FileUploadModule,
            imports: options.imports,
            providers: [
                FileUploadService,
                FileUploadInterceptor,
                SingleFileUploadInterceptor,
                {
                    provide: FILE_UPLOAD_OPTIONS,
                    inject: options.inject ?? [],
                    useFactory: options.useFactory,
                },
                {
                    provide: FILE_STORAGE_CLIENT,
                    inject: [FILE_UPLOAD_OPTIONS],
                    useFactory: (resolved: FileUploadModuleOptions) => resolved.storageClient,
                },
            ],
            exports: [FileUploadService, FileUploadInterceptor, SingleFileUploadInterceptor],
        };
    }
}
