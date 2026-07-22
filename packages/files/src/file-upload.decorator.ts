import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { FileUploadRequest } from './file-upload.interceptor';
import type { FileValidationOptions } from './file-upload.service';

export const FILE_UPLOAD_KEY = 'file_upload';
/** @deprecated UploadedFile is now a request parameter decorator. */
export const SINGLE_FILE_UPLOAD_KEY = 'file_upload:single';
/** @deprecated UploadedFiles is now a request parameter decorator. */
export const MULTIPLE_FILE_UPLOAD_KEY = 'file_upload:multiple';

export interface FileUploadMetadata extends FileValidationOptions {
    fieldName?: string;
}

/** Configure validation and field selection for a file upload interceptor. */
export const FileUpload = (options: FileUploadMetadata = {}) => SetMetadata(FILE_UPLOAD_KEY, options);

/** Read the file stored on the request by SingleFileUploadInterceptor. */
export const UploadedFile = createParamDecorator(
    (_data: unknown, context: ExecutionContext) => context.switchToHttp().getRequest<FileUploadRequest>().uploadedFile,
);

/** Read the files stored on the request by FileUploadInterceptor. */
export const UploadedFiles = createParamDecorator(
    (_data: unknown, context: ExecutionContext) => context.switchToHttp().getRequest<FileUploadRequest>().uploadedFiles,
);
