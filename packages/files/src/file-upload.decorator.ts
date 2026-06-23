import { SetMetadata } from '@nestjs/common';

export const FILE_UPLOAD_KEY = 'file_upload';
export const SINGLE_FILE_UPLOAD_KEY = 'file_upload:single';
export const MULTIPLE_FILE_UPLOAD_KEY = 'file_upload:multiple';

export interface FileUploadMetadata {
    fieldName?: string;
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
    maxCount?: number;
}

export const FileUpload = (options: FileUploadMetadata = {}) => SetMetadata(FILE_UPLOAD_KEY, options);
export const UploadedFile = () => SetMetadata(SINGLE_FILE_UPLOAD_KEY, true);
export const UploadedFiles = () => SetMetadata(MULTIPLE_FILE_UPLOAD_KEY, true);
