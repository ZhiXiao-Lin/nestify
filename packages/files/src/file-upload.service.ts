import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, Logger, Optional } from '@nestjs/common';

export interface FileStorageClient {
    upload(key: string, body: Buffer, options?: { contentType?: string }): Promise<unknown>;
    getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
    delete(key: string): Promise<unknown>;
    exists(key: string): Promise<boolean>;
}

export const FILE_STORAGE_CLIENT = Symbol('FILE_STORAGE_CLIENT');
export const FILE_UPLOAD_OPTIONS = Symbol('FILE_UPLOAD_OPTIONS');

export interface StoredUploadedFile {
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
    url: string;
    key: string;
    hash?: string;
    uploadedAt: Date;
}

export interface FileValidationOptions {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
}

export interface StoredNameInput {
    originalName: string;
    mimeType: string;
    size: number;
}

export interface FileUploadOptions {
    keyPrefix?: string;
    signedUrlExpiresInSeconds?: number;
    storedNameFactory?: (input: StoredNameInput) => string;
}

export const DEFAULT_FILE_VALIDATION: FileValidationOptions = {
    maxSize: 10 * 1024 * 1024,
    allowedTypes: [
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/json',
    ],
};

export const DEFAULT_FILE_UPLOAD_OPTIONS: Required<Omit<FileUploadOptions, 'storedNameFactory'>> = {
    keyPrefix: 'uploads',
    signedUrlExpiresInSeconds: 3600,
};

@Injectable()
export class FileUploadService {
    private readonly logger = new Logger(FileUploadService.name);
    private readonly options: FileUploadOptions;

    constructor(
        @Optional() @Inject(FILE_STORAGE_CLIENT) private readonly storageClient?: FileStorageClient,
        @Optional() @Inject(FILE_UPLOAD_OPTIONS) options?: FileUploadOptions,
    ) {
        this.options = { ...DEFAULT_FILE_UPLOAD_OPTIONS, ...options };
    }

    async uploadFile(
        buffer: Buffer,
        filename: string,
        mimeType: string,
        options?: FileValidationOptions,
    ): Promise<StoredUploadedFile> {
        const validation = { ...DEFAULT_FILE_VALIDATION, ...options };
        this.validateFile(buffer, filename, mimeType, validation);

        const storedName = this.generateStoredName({ originalName: filename, mimeType, size: buffer.length });
        const key = this.buildKey(storedName);
        const storage = this.getStorageClient();

        await storage.upload(key, buffer, { contentType: mimeType });
        this.logger.log(`File uploaded: ${filename} -> ${storedName}`);

        return {
            originalName: filename,
            storedName,
            mimeType,
            size: buffer.length,
            key,
            url: await storage.getSignedUrl(key, this.options.signedUrlExpiresInSeconds),
            uploadedAt: new Date(),
        };
    }

    async uploadFiles(
        files: Array<{ buffer: Buffer; filename: string; mimeType: string }>,
        options?: FileValidationOptions,
    ): Promise<StoredUploadedFile[]> {
        return Promise.all(files.map(file => this.uploadFile(file.buffer, file.filename, file.mimeType, options)));
    }

    async deleteFile(storedName: string): Promise<void> {
        const key = this.buildKey(storedName);
        await this.getStorageClient().delete(key);
        this.logger.log(`File deleted: ${storedName}`);
    }

    async getFileUrl(storedName: string, expiresInSeconds = this.options.signedUrlExpiresInSeconds): Promise<string> {
        return this.getStorageClient().getSignedUrl(this.buildKey(storedName), expiresInSeconds);
    }

    async fileExists(storedName: string): Promise<boolean> {
        return this.getStorageClient().exists(this.buildKey(storedName));
    }

    validateFile(buffer: Buffer, filename: string, mimeType: string, options: FileValidationOptions): void {
        if (options.maxSize && buffer.length > options.maxSize) {
            const maxMB = options.maxSize / (1024 * 1024);
            throw new BadRequestException(`File size exceeds maximum allowed (${maxMB}MB)`);
        }

        if (options.allowedTypes && !options.allowedTypes.includes(mimeType)) {
            throw new BadRequestException(
                `File type '${mimeType}' is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`,
            );
        }

        if (options.allowedExtensions) {
            const ext = getExtension(filename).toLowerCase();
            const allowedExts = options.allowedExtensions.map(extension => extension.toLowerCase());
            if (!allowedExts.includes(ext)) {
                throw new BadRequestException(
                    `File extension '${ext}' is not allowed. Allowed extensions: ${allowedExts.join(', ')}`,
                );
            }
        }
    }

    buildKey(storedName: string): string {
        const prefix = normalizePrefix(this.options.keyPrefix ?? DEFAULT_FILE_UPLOAD_OPTIONS.keyPrefix);
        return prefix ? `${prefix}/${storedName}` : storedName;
    }

    private getStorageClient(): FileStorageClient {
        if (!this.storageClient) {
            throw new Error('File storage client is not configured');
        }
        return this.storageClient;
    }

    private generateStoredName(input: StoredNameInput): string {
        if (this.options.storedNameFactory) {
            return this.options.storedNameFactory(input);
        }
        return `${Date.now()}-${randomUUID()}${getExtension(input.originalName)}`;
    }
}

export function getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
}

function normalizePrefix(prefix: string): string {
    return prefix.trim().replace(/^\/+|\/+$/g, '');
}
