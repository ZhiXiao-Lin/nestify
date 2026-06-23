// ============================================================================
// File Upload Service - Multipart handling and storage
// ============================================================================

import { BadRequestException, Inject, Injectable, Logger, Optional } from '@nestjs/common';

export interface FileStorageClient {
    upload(key: string, body: Buffer, options?: { contentType?: string }): Promise<unknown>;
    getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
    delete(key: string): Promise<unknown>;
    exists(key: string): Promise<boolean>;
}

export const FILE_STORAGE_CLIENT = Symbol('FILE_STORAGE_CLIENT');

export interface UploadedFile {
    /** Original filename */
    originalName: string;
    /** Stored filename (unique) */
    storedName: string;
    /** File MIME type */
    mimeType: string;
    /** File size in bytes */
    size: number;
    /** Full URL to access the file */
    url: string;
    /** SHA256 hash of file content */
    hash?: string;
    /** Upload timestamp */
    uploadedAt: Date;
}

export interface FileValidationOptions {
    /** Maximum file size in bytes */
    maxSize?: number;
    /** Allowed MIME types (e.g., ['image/png', 'image/jpeg']) */
    allowedTypes?: string[];
    /** Allowed extensions (e.g., ['.png', '.jpg']) */
    allowedExtensions?: string[];
}

/**
 * Default validation options
 */
export const DEFAULT_FILE_VALIDATION: FileValidationOptions = {
    maxSize: 10 * 1024 * 1024, // 10MB
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

/**
 * File Upload Service - handles file uploads with RustFS storage
 */
@Injectable()
export class FileUploadService {
    private readonly logger = new Logger(FileUploadService.name);

    constructor(@Optional() @Inject(FILE_STORAGE_CLIENT) private readonly rustFsService?: FileStorageClient) {}

    /**
     * Upload a single file
     */
    async uploadFile(
        buffer: Buffer,
        filename: string,
        mimeType: string,
        options?: FileValidationOptions,
    ): Promise<UploadedFile> {
        const validation = { ...DEFAULT_FILE_VALIDATION, ...options };

        // Validate file
        this.validateFile(buffer, filename, mimeType, validation);

        // Generate unique filename
        const storedName = this.generateStoredName(filename);

        // Upload to storage
        const key = `uploads/${storedName}`;
        const storage = this.getStorageClient();
        await storage.upload(key, buffer, { contentType: mimeType });

        this.logger.log(`File uploaded: ${filename} -> ${storedName}`);

        return {
            originalName: filename,
            storedName,
            mimeType,
            size: buffer.length,
            url: await storage.getSignedUrl(key),
            uploadedAt: new Date(),
        };
    }

    /**
     * Upload multiple files
     */
    async uploadFiles(
        files: Array<{ buffer: Buffer; filename: string; mimeType: string }>,
        options?: FileValidationOptions,
    ): Promise<UploadedFile[]> {
        const results: UploadedFile[] = [];

        for (const file of files) {
            const result = await this.uploadFile(file.buffer, file.filename, file.mimeType, options);
            results.push(result);
        }

        return results;
    }

    /**
     * Delete a file
     */
    async deleteFile(storedName: string): Promise<void> {
        const key = `uploads/${storedName}`;
        await this.getStorageClient().delete(key);
        this.logger.log(`File deleted: ${storedName}`);
    }

    /**
     * Get file URL
     */
    async getFileUrl(storedName: string, expiresInSeconds = 3600): Promise<string> {
        const key = `uploads/${storedName}`;
        return this.getStorageClient().getSignedUrl(key, expiresInSeconds);
    }

    /**
     * Check if file exists
     */
    async fileExists(storedName: string): Promise<boolean> {
        const key = `uploads/${storedName}`;
        return this.getStorageClient().exists(key);
    }

    private getStorageClient(): FileStorageClient {
        if (!this.rustFsService) {
            throw new Error('File storage client is not configured');
        }
        return this.rustFsService;
    }

    /**
     * Validate file
     */
    private validateFile(
        buffer: Buffer,
        filename: string,
        mimeType: string,
        options: FileValidationOptions,
    ): void {
        // Check size
        if (options.maxSize && buffer.length > options.maxSize) {
            const maxMB = options.maxSize / (1024 * 1024);
            throw new BadRequestException(`File size exceeds maximum allowed (${maxMB}MB)`);
        }

        // Check MIME type
        if (options.allowedTypes && !options.allowedTypes.includes(mimeType)) {
            throw new BadRequestException(
                `File type '${mimeType}' is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`,
            );
        }

        // Check extension
        if (options.allowedExtensions) {
            const ext = this.getExtension(filename).toLowerCase();
            const allowedExts = options.allowedExtensions.map(e => e.toLowerCase());
            if (!allowedExts.includes(ext)) {
                throw new BadRequestException(
                    `File extension '${ext}' is not allowed. Allowed extensions: ${allowedExts.join(', ')}`,
                );
            }
        }
    }

    /**
     * Generate unique filename
     */
    private generateStoredName(originalName: string): string {
        const ext = this.getExtension(originalName);
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `${timestamp}-${random}${ext}`;
    }

    /**
     * Get file extension
     */
    private getExtension(filename: string): string {
        const lastDot = filename.lastIndexOf('.');
        return lastDot !== -1 ? filename.substring(lastDot) : '';
    }
}
