// ============================================================================
// File Upload Decorators
// ============================================================================

import { SetMetadata } from '@nestjs/common';

export const FILE_UPLOAD_KEY = 'file_upload';

/**
 * Decorator to mark endpoint for file upload handling
 */
export const FileUpload = (options?: {
    fieldName?: string;
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
    maxCount?: number;
}) => SetMetadata(FILE_UPLOAD_KEY, options ?? {});

/**
 * Upload single file
 */
export const UploadedFile = () => SetMetadata('isSingleFile', true);

/**
 * Upload multiple files
 */
export const UploadedFiles = () => SetMetadata('isMultipleFiles', true);
