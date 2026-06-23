import { DynamicModule, Module, Provider } from '@nestjs/common';
import { FILE_STORAGE_CLIENT, FILE_UPLOAD_OPTIONS, FileStorageClient, FileUploadOptions } from './file-upload.service';
import { FileUploadInterceptor, SingleFileUploadInterceptor } from './file-upload.interceptor';
import { FileUploadService } from './file-upload.service';

export interface FileUploadModuleOptions extends FileUploadOptions {
    storageClient?: FileStorageClient;
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
}
