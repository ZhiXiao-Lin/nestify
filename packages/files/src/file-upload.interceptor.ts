import {
    BadRequestException,
    type CallHandler,
    type ExecutionContext,
    Injectable,
    type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { catchError, from, map, type Observable } from 'rxjs';
import { FILE_UPLOAD_KEY, type FileUploadMetadata } from './file-upload.decorator';
import { FileUploadService, type StoredUploadedFile } from './file-upload.service';

export interface MultipartFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

export interface FileUploadRequest extends Request {
    file?: MultipartFile;
    files?: MultipartFile[] | Record<string, MultipartFile | MultipartFile[]>;
    uploadedFile?: StoredUploadedFile;
    uploadedFiles?: StoredUploadedFile[];
}

@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
    constructor(
        private readonly fileUploadService: FileUploadService,
        private readonly reflector: Reflector,
    ) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
        const request = context.switchToHttp().getRequest<FileUploadRequest>();
        const metadata = getUploadMetadata(this.reflector, context);
        const files = extractFiles(request, metadata.fieldName);

        if (files.length === 0) {
            throw new BadRequestException(
                metadata.fieldName ? `No file uploaded for field '${metadata.fieldName}'` : 'No file uploaded',
            );
        }

        const uploadedFiles = await this.fileUploadService.uploadFiles(
            files.map(file => ({ buffer: file.buffer, filename: file.originalname, mimeType: file.mimetype })),
            metadata,
        );
        request.uploadedFiles = uploadedFiles;

        return (await this.callNext(next, uploadedFiles)).pipe(
            map(response => {
                if (response && typeof response === 'object' && !Array.isArray(response)) {
                    return { ...response, files: uploadedFiles };
                }
                return { files: uploadedFiles };
            }),
            catchError(error => from(rollbackAndRethrow(this.fileUploadService, uploadedFiles, error))),
        );
    }

    private async callNext(next: CallHandler, uploadedFiles: StoredUploadedFile[]): Promise<Observable<unknown>> {
        try {
            return next.handle();
        } catch (error) {
            return rollbackAndRethrow(this.fileUploadService, uploadedFiles, error);
        }
    }
}

@Injectable()
export class SingleFileUploadInterceptor implements NestInterceptor {
    constructor(
        private readonly fileUploadService: FileUploadService,
        private readonly reflector: Reflector,
    ) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
        const request = context.switchToHttp().getRequest<FileUploadRequest>();
        const metadata = getUploadMetadata(this.reflector, context);
        const files = extractFiles(request, metadata.fieldName);

        if (files.length === 0) {
            throw new BadRequestException(
                metadata.fieldName ? `No file uploaded for field '${metadata.fieldName}'` : 'No file uploaded',
            );
        }
        if (files.length > 1) {
            throw new BadRequestException('Single-file upload received more than one file');
        }

        const file = files[0];
        const uploadedFile = await this.fileUploadService.uploadFile(
            file.buffer,
            file.originalname,
            file.mimetype,
            metadata,
        );
        request.uploadedFile = uploadedFile;

        return (await this.callNext(next, uploadedFile)).pipe(
            map(response => {
                if (response && typeof response === 'object' && !Array.isArray(response)) {
                    return { ...response, file: uploadedFile };
                }
                return { file: uploadedFile };
            }),
            catchError(error => from(rollbackAndRethrow(this.fileUploadService, [uploadedFile], error))),
        );
    }

    private async callNext(next: CallHandler, uploadedFile: StoredUploadedFile): Promise<Observable<unknown>> {
        try {
            return next.handle();
        } catch (error) {
            return rollbackAndRethrow(this.fileUploadService, [uploadedFile], error);
        }
    }
}

export function extractFiles(request: Pick<FileUploadRequest, 'file' | 'files'>, fieldName?: string): MultipartFile[] {
    let files: MultipartFile[];
    if (request.file) {
        files = [request.file];
    } else if (Array.isArray(request.files)) {
        files = request.files;
    } else if (request.files && typeof request.files === 'object') {
        files = Object.values(request.files).flatMap(file => (Array.isArray(file) ? file : [file]));
    } else {
        files = [];
    }

    return fieldName ? files.filter(file => file.fieldname === fieldName) : files;
}

function getUploadMetadata(reflector: Reflector, context: ExecutionContext): FileUploadMetadata {
    return (
        reflector.getAllAndOverride<FileUploadMetadata>(FILE_UPLOAD_KEY, [context.getHandler(), context.getClass()]) ??
        {}
    );
}

async function rollbackAndRethrow(
    service: FileUploadService,
    uploadedFiles: StoredUploadedFile[],
    error: unknown,
): Promise<never> {
    if (service.shouldRollbackOnHandlerError()) {
        await service.cleanupUploadedFiles(uploadedFiles, error);
    }
    throw error;
}
