import { Module } from '@nestjs/common';
import { FileUploadInterceptor, SingleFileUploadInterceptor } from './file-upload.interceptor';
import { FileUploadService } from './file-upload.service';

export { FILE_STORAGE_CLIENT, FileUploadService } from './file-upload.service';
export type { FileStorageClient, UploadedFile, FileValidationOptions } from './file-upload.service';
export { FileUploadInterceptor, SingleFileUploadInterceptor } from './file-upload.interceptor';

@Module({
    providers: [FileUploadService, FileUploadInterceptor, SingleFileUploadInterceptor],
    exports: [FileUploadService, FileUploadInterceptor, SingleFileUploadInterceptor],
})
export class FileUploadModule {}
