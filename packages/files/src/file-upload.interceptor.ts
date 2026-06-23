import { BadRequestException, CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FileUploadService, StoredUploadedFile } from './file-upload.service';

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
    constructor(private readonly fileUploadService: FileUploadService) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
        const request = context.switchToHttp().getRequest<FileUploadRequest>();
        const files = extractFiles(request);

        if (files.length === 0) {
            throw new BadRequestException('No file uploaded');
        }

        const uploadedFiles = await Promise.all(
            files.map(file => this.fileUploadService.uploadFile(file.buffer, file.originalname, file.mimetype)),
        );
        request.uploadedFiles = uploadedFiles;

        return next.handle().pipe(
            map(response => {
                if (response && typeof response === 'object' && !Array.isArray(response)) {
                    return { ...response, files: uploadedFiles };
                }
                return { files: uploadedFiles };
            }),
        );
    }
}

@Injectable()
export class SingleFileUploadInterceptor implements NestInterceptor {
    constructor(private readonly fileUploadService: FileUploadService) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
        const request = context.switchToHttp().getRequest<FileUploadRequest>();
        const file = request.file ?? firstFileFromFiles(request.files);

        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const uploadedFile = await this.fileUploadService.uploadFile(file.buffer, file.originalname, file.mimetype);
        request.uploadedFile = uploadedFile;

        return next.handle().pipe(
            map(response => {
                if (response && typeof response === 'object' && !Array.isArray(response)) {
                    return { ...response, file: uploadedFile };
                }
                return { file: uploadedFile };
            }),
        );
    }
}

export function extractFiles(request: Pick<FileUploadRequest, 'file' | 'files'>): MultipartFile[] {
    if (request.file) {
        return [request.file];
    }

    if (Array.isArray(request.files)) {
        return request.files;
    }

    if (!request.files || typeof request.files !== 'object') {
        return [];
    }

    return Object.values(request.files).flatMap(file => (Array.isArray(file) ? file : [file]));
}

function firstFileFromFiles(files: FileUploadRequest['files']): MultipartFile | undefined {
    return extractFiles({ files })[0];
}
