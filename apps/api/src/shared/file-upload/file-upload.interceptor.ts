// ============================================================================
// File Upload Interceptor - Handles multipart file uploads
// ============================================================================

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FileUploadService } from './file-upload.service';

export interface UploadedFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

export interface FileUploadMetadata {
    /** Field name in the form */
    fieldname: string;
    /** Maximum file size in bytes */
    maxSize?: number;
    /** Allowed MIME types */
    allowedTypes?: string[];
    /** Allowed extensions */
    allowedExtensions?: string[];
    /** Whether file is required */
    required?: boolean;
}

/**
 * Interceptor that processes multipart file uploads
 */
@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
    constructor(private readonly fileUploadService: FileUploadService) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest();

        if (!request.body || !request.files) {
            throw new BadRequestException('No file uploaded');
        }

        // Handle both single and multiple files
        const files = this.extractFiles(request);

        // Process and upload files
        const uploadedFiles = await Promise.all(
            files.map(async (file) => {
                return this.fileUploadService.uploadFile(
                    file.buffer,
                    file.originalname,
                    file.mimetype,
                );
            }),
        );

        // Attach uploaded files to request
        request.uploadedFiles = uploadedFiles;

        return next.handle().pipe(
            map((response) => {
                // If response already contains data, merge uploaded files
                if (response && typeof response === 'object') {
                    return {
                        ...response,
                        files: uploadedFiles,
                    };
                }
                return { files: uploadedFiles };
            }),
        );
    }

    /**
     * Extract files from request
     */
    private extractFiles(request: any): UploadedFile[] {
        const files: UploadedFile[] = [];

        if (Array.isArray(request.files)) {
            // Multiple files as array
            files.push(...request.files);
        } else if (request.files && typeof request.files === 'object') {
            // Files as object (fieldname -> file or array)
            for (const fieldName of Object.keys(request.files)) {
                const fieldFiles = request.files[fieldName];
                if (Array.isArray(fieldFiles)) {
                    files.push(...fieldFiles);
                } else {
                    files.push(fieldFiles);
                }
            }
        }

        return files;
    }
}

/**
 * Single file upload interceptor
 */
@Injectable()
export class SingleFileUploadInterceptor implements NestInterceptor {
    constructor(private readonly fileUploadService: FileUploadService) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest();

        if (!request.file && !request.files?.file) {
            throw new BadRequestException('No file uploaded');
        }

        const file = request.file || request.files?.file;

        const uploadedFile = await this.fileUploadService.uploadFile(
            file.buffer,
            file.originalname,
            file.mimetype,
        );

        request.uploadedFile = uploadedFile;

        return next.handle().pipe(
            map((response) => {
                if (response && typeof response === 'object') {
                    return {
                        ...response,
                        file: uploadedFile,
                    };
                }
                return { file: uploadedFile };
            }),
        );
    }
}
