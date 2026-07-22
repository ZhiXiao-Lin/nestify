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

export interface FileUploadInput {
    buffer: Buffer;
    filename: string;
    mimeType: string;
}

export interface FileValidationOptions {
    maxSize?: number;
    allowedTypes?: readonly string[];
    allowedExtensions?: readonly string[];
    maxCount?: number;
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
    validation?: FileValidationOptions;
    maxFiles?: number;
    maxConcurrentUploads?: number;
    rollbackOnFailure?: boolean;
    rollbackOnHandlerError?: boolean;
}

export interface FileCleanupFailure {
    key: string;
    error: unknown;
}

export class FileCleanupError extends Error {
    constructor(
        public readonly failures: ReadonlyArray<FileCleanupFailure>,
        cause?: unknown,
    ) {
        super(`Failed to clean up ${failures.length} uploaded file${failures.length === 1 ? '' : 's'}`, { cause });
        this.name = 'FileCleanupError';
    }
}

export class FileBatchUploadError extends Error {
    constructor(
        public readonly operationErrors: readonly unknown[],
        public readonly cleanupFailures: ReadonlyArray<FileCleanupFailure> = [],
    ) {
        super(
            `Batch upload failed with ${operationErrors.length} operation error${operationErrors.length === 1 ? '' : 's'}`,
            { cause: operationErrors[0] },
        );
        this.name = 'FileBatchUploadError';
    }
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

export const DEFAULT_FILE_UPLOAD_OPTIONS: Required<Omit<FileUploadOptions, 'storedNameFactory' | 'validation'>> = {
    keyPrefix: 'uploads',
    signedUrlExpiresInSeconds: 3600,
    maxFiles: 10,
    maxConcurrentUploads: 4,
    rollbackOnFailure: true,
    rollbackOnHandlerError: true,
};

type ResolvedFileUploadOptions = typeof DEFAULT_FILE_UPLOAD_OPTIONS & Pick<FileUploadOptions, 'storedNameFactory'>;

interface PreparedUpload extends FileUploadInput {
    storedName: string;
    key: string;
}

@Injectable()
export class FileUploadService {
    private readonly logger = new Logger(FileUploadService.name);
    private readonly options: ResolvedFileUploadOptions;
    private readonly defaultValidation: FileValidationOptions;

    constructor(
        @Optional() @Inject(FILE_STORAGE_CLIENT) private readonly storageClient?: FileStorageClient,
        @Optional() @Inject(FILE_UPLOAD_OPTIONS) options?: FileUploadOptions,
    ) {
        this.options = {
            keyPrefix: normalizePrefix(options?.keyPrefix ?? DEFAULT_FILE_UPLOAD_OPTIONS.keyPrefix),
            signedUrlExpiresInSeconds: requirePositiveInteger(
                options?.signedUrlExpiresInSeconds ?? DEFAULT_FILE_UPLOAD_OPTIONS.signedUrlExpiresInSeconds,
                'signedUrlExpiresInSeconds',
            ),
            maxFiles: requirePositiveInteger(options?.maxFiles ?? DEFAULT_FILE_UPLOAD_OPTIONS.maxFiles, 'maxFiles'),
            maxConcurrentUploads: requirePositiveInteger(
                options?.maxConcurrentUploads ?? DEFAULT_FILE_UPLOAD_OPTIONS.maxConcurrentUploads,
                'maxConcurrentUploads',
            ),
            rollbackOnFailure: options?.rollbackOnFailure ?? DEFAULT_FILE_UPLOAD_OPTIONS.rollbackOnFailure,
            rollbackOnHandlerError:
                options?.rollbackOnHandlerError ?? DEFAULT_FILE_UPLOAD_OPTIONS.rollbackOnHandlerError,
            storedNameFactory: options?.storedNameFactory,
        };
        this.defaultValidation = {
            ...DEFAULT_FILE_VALIDATION,
            ...options?.validation,
            allowedTypes: [...(options?.validation?.allowedTypes ?? DEFAULT_FILE_VALIDATION.allowedTypes ?? [])],
            allowedExtensions: options?.validation?.allowedExtensions
                ? [...options.validation.allowedExtensions]
                : undefined,
        };
        validateValidationConfiguration(this.defaultValidation);
    }

    async uploadFile(
        buffer: Buffer,
        filename: string,
        mimeType: string,
        options?: FileValidationOptions,
    ): Promise<StoredUploadedFile> {
        return this.uploadPrepared(this.prepareUpload({ buffer, filename, mimeType }, options));
    }

    async uploadFiles(
        files: readonly FileUploadInput[],
        options?: FileValidationOptions,
    ): Promise<StoredUploadedFile[]> {
        const maxCount = options?.maxCount ?? this.defaultValidation.maxCount ?? this.options.maxFiles;
        assertValidMaxCount(maxCount);
        if (files.length > maxCount) {
            throw new BadRequestException(`File count exceeds maximum allowed (${maxCount})`);
        }

        // Validate and allocate every key before starting any remote write.
        const prepared = files.map(file => this.prepareUpload(file, options));
        const duplicateKey = findDuplicate(prepared.map(file => file.key));
        if (duplicateKey) {
            throw new BadRequestException(`Batch upload generated duplicate object key '${duplicateKey}'`);
        }
        if (prepared.length === 0) {
            return [];
        }

        const settled = await this.uploadPreparedBatch(prepared);
        const operationErrors = settled.flatMap(result => (result?.status === 'rejected' ? [result.reason] : []));
        const successfulFiles = settled.flatMap(result => (result?.status === 'fulfilled' ? [result.value] : []));

        if (operationErrors.length > 0) {
            const cleanupFailures = operationErrors.flatMap(error =>
                error instanceof FileCleanupError ? error.failures : [],
            );

            if (this.options.rollbackOnFailure && successfulFiles.length > 0) {
                try {
                    await this.cleanupUploadedFiles(successfulFiles, operationErrors[0]);
                } catch (error) {
                    if (error instanceof FileCleanupError) {
                        cleanupFailures.push(...error.failures);
                    } else {
                        cleanupFailures.push({ key: '<unknown>', error });
                    }
                }
            }

            throw new FileBatchUploadError(operationErrors, cleanupFailures);
        }

        return settled.map(result => (result as PromiseFulfilledResult<StoredUploadedFile>).value);
    }

    async cleanupUploadedFiles(files: ReadonlyArray<Pick<StoredUploadedFile, 'key'>>, cause?: unknown): Promise<void> {
        await this.cleanupKeys(
            files.map(file => this.validateOwnedKey(file.key)),
            cause,
        );
    }

    async deleteFile(storedName: string): Promise<void> {
        const key = this.buildKey(storedName);
        await this.getStorageClient().delete(key);
        this.logger.log(`File deleted: ${storedName}`);
    }

    async getFileUrl(storedName: string, expiresInSeconds = this.options.signedUrlExpiresInSeconds): Promise<string> {
        if (!Number.isInteger(expiresInSeconds) || expiresInSeconds <= 0) {
            throw new BadRequestException('expiresInSeconds must be a positive integer');
        }
        return this.getStorageClient().getSignedUrl(this.buildKey(storedName), expiresInSeconds);
    }

    async fileExists(storedName: string): Promise<boolean> {
        return this.getStorageClient().exists(this.buildKey(storedName));
    }

    shouldRollbackOnHandlerError(): boolean {
        return this.options.rollbackOnHandlerError;
    }

    validateFile(buffer: Buffer, filename: string, mimeType: string, options: FileValidationOptions): void {
        validateValidationConfiguration(options, true);
        const normalizedFilename = filename.trim();
        const normalizedMimeType = normalizeMimeType(mimeType);

        if (!normalizedFilename || CONTROL_CHARACTERS.test(normalizedFilename)) {
            throw new BadRequestException('File name must be non-empty and contain no control characters');
        }
        if (!normalizedMimeType) {
            throw new BadRequestException('File MIME type must be non-empty');
        }

        if (options.maxSize !== undefined && buffer.length > options.maxSize) {
            const maxMB = options.maxSize / (1024 * 1024);
            throw new BadRequestException(`File size exceeds maximum allowed (${maxMB}MB)`);
        }

        if (options.allowedTypes) {
            const allowedTypes = options.allowedTypes.map(normalizeMimeType);
            if (!allowedTypes.includes(normalizedMimeType)) {
                throw new BadRequestException(
                    `File type '${normalizedMimeType}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
                );
            }
        }

        if (options.allowedExtensions) {
            const extension = getExtension(normalizedFilename).toLowerCase();
            const allowedExtensions = options.allowedExtensions.map(normalizeExtension);
            if (!allowedExtensions.includes(extension)) {
                throw new BadRequestException(
                    `File extension '${extension}' is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`,
                );
            }
        }
    }

    buildKey(storedName: string): string {
        const normalizedStoredName = normalizeStoredName(storedName);
        return this.options.keyPrefix ? `${this.options.keyPrefix}/${normalizedStoredName}` : normalizedStoredName;
    }

    private prepareUpload(input: FileUploadInput, options?: FileValidationOptions): PreparedUpload {
        const validation = {
            ...this.defaultValidation,
            ...options,
            allowedTypes: options?.allowedTypes ?? this.defaultValidation.allowedTypes,
            allowedExtensions: options?.allowedExtensions ?? this.defaultValidation.allowedExtensions,
        };
        const mimeType = normalizeMimeType(input.mimeType);
        this.validateFile(input.buffer, input.filename, mimeType, validation);

        const storedName = normalizeStoredName(
            this.generateStoredName({
                originalName: input.filename,
                mimeType,
                size: input.buffer.length,
            }),
        );

        return {
            ...input,
            mimeType,
            storedName,
            key: this.buildKey(storedName),
        };
    }

    private async uploadPrepared(prepared: PreparedUpload): Promise<StoredUploadedFile> {
        const storage = this.getStorageClient();
        await storage.upload(prepared.key, prepared.buffer, { contentType: prepared.mimeType });

        let url: string;
        try {
            url = await storage.getSignedUrl(prepared.key, this.options.signedUrlExpiresInSeconds);
            if (!url) {
                throw new Error('Storage client returned an empty signed URL');
            }
        } catch (error) {
            if (this.options.rollbackOnFailure) {
                await this.cleanupKeys([prepared.key], error);
            }
            throw error;
        }

        this.logger.log(`File uploaded: ${prepared.filename} -> ${prepared.storedName}`);

        return {
            originalName: prepared.filename,
            storedName: prepared.storedName,
            mimeType: prepared.mimeType,
            size: prepared.buffer.length,
            key: prepared.key,
            url,
            uploadedAt: new Date(),
        };
    }

    private async uploadPreparedBatch(
        prepared: PreparedUpload[],
    ): Promise<Array<PromiseSettledResult<StoredUploadedFile> | undefined>> {
        const results: Array<PromiseSettledResult<StoredUploadedFile> | undefined> = new Array(prepared.length);
        let nextIndex = 0;
        let stopScheduling = false;

        const worker = async () => {
            while (!stopScheduling) {
                const index = nextIndex;
                nextIndex += 1;
                if (index >= prepared.length) {
                    return;
                }

                try {
                    results[index] = { status: 'fulfilled', value: await this.uploadPrepared(prepared[index]) };
                } catch (reason) {
                    results[index] = { status: 'rejected', reason };
                    stopScheduling = true;
                }
            }
        };

        const workerCount = Math.min(this.options.maxConcurrentUploads, prepared.length);
        await Promise.all(Array.from({ length: workerCount }, () => worker()));
        return results;
    }

    private async cleanupKeys(keys: string[], cause?: unknown): Promise<void> {
        const uniqueKeys = [...new Set(keys)];
        if (uniqueKeys.length === 0) {
            return;
        }
        const storage = this.getStorageClient();
        const results = await Promise.allSettled(uniqueKeys.map(key => storage.delete(key)));
        const failures = results.flatMap((result, index) =>
            result.status === 'rejected' ? [{ key: uniqueKeys[index], error: result.reason }] : [],
        );

        if (failures.length > 0) {
            this.logger.error(`Failed to clean up ${failures.length} uploaded file(s)`);
            throw new FileCleanupError(failures, cause);
        }
    }

    private getStorageClient(): FileStorageClient {
        if (!this.storageClient) {
            throw new Error('File storage client is not configured');
        }
        return this.storageClient;
    }

    private validateOwnedKey(key: string): string {
        let normalized: string;
        try {
            normalized = validateObjectPath(key.trim(), 'key');
        } catch (error) {
            throw new BadRequestException(error instanceof Error ? error.message : 'Invalid uploaded file key');
        }

        if (this.options.keyPrefix && !normalized.startsWith(`${this.options.keyPrefix}/`)) {
            throw new BadRequestException('Uploaded file key is outside the configured keyPrefix');
        }
        return normalized;
    }

    private generateStoredName(input: StoredNameInput): string {
        if (this.options.storedNameFactory) {
            return this.options.storedNameFactory(input);
        }
        return `${Date.now()}-${randomUUID()}${getExtension(input.originalName)}`;
    }
}

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function getExtension(filename: string): string {
    const basename = filename.replace(/\\/g, '/').split('/').pop() ?? '';
    const lastDot = basename.lastIndexOf('.');
    return lastDot > 0 ? basename.substring(lastDot) : '';
}

function normalizeMimeType(mimeType: string): string {
    return mimeType.split(';', 1)[0].trim().toLowerCase();
}

function normalizeExtension(extension: string): string {
    const normalized = extension.trim().toLowerCase();
    return normalized && !normalized.startsWith('.') ? `.${normalized}` : normalized;
}

function normalizePrefix(prefix: string): string {
    const normalized = prefix.trim().replace(/^\/+|\/+$/g, '');
    return normalized ? validateObjectPath(normalized, 'keyPrefix') : '';
}

function normalizeStoredName(storedName: string): string {
    const normalized = storedName.trim();
    try {
        return validateObjectPath(normalized, 'storedName');
    } catch (error) {
        throw new BadRequestException(error instanceof Error ? error.message : 'Invalid stored file name');
    }
}

function validateObjectPath(value: string, label: string): string {
    if (
        !value ||
        value.startsWith('/') ||
        value.endsWith('/') ||
        value.includes('\\') ||
        CONTROL_CHARACTERS.test(value)
    ) {
        throw new Error(`${label} must be a non-empty relative object path`);
    }

    const segments = value.split('/');
    for (const segment of segments) {
        let decoded = segment;
        for (let depth = 0; depth < 3; depth += 1) {
            try {
                const next = decodeURIComponent(decoded);
                if (next === decoded) break;
                decoded = next;
            } catch {
                // A literal percent sign is valid in an object key and is left unchanged.
                break;
            }
        }
        if (!segment || decoded === '.' || decoded === '..' || decoded.includes('/') || decoded.includes('\\')) {
            throw new Error(`${label} contains an unsafe path segment`);
        }
    }

    return segments.join('/');
}

function requirePositiveInteger(value: number, label: string): number {
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${label} must be a positive integer`);
    }
    return value;
}

function assertValidMaxCount(maxCount: number): void {
    if (!Number.isInteger(maxCount) || maxCount <= 0) {
        throw new BadRequestException('maxCount must be a positive integer');
    }
}

function validateValidationConfiguration(options: FileValidationOptions, requestError = false): void {
    const invalid =
        (options.maxSize !== undefined && (!Number.isInteger(options.maxSize) || options.maxSize < 0)) ||
        (options.maxCount !== undefined && (!Number.isInteger(options.maxCount) || options.maxCount <= 0)) ||
        options.allowedTypes?.some(type => !normalizeMimeType(type) || CONTROL_CHARACTERS.test(type)) ||
        options.allowedExtensions?.some(
            extension => !normalizeExtension(extension) || CONTROL_CHARACTERS.test(extension),
        );
    if (invalid) {
        const message = 'File validation options contain invalid limits or empty values';
        if (requestError) {
            throw new BadRequestException(message);
        }
        throw new Error(message);
    }
}

function findDuplicate(values: string[]): string | undefined {
    const seen = new Set<string>();
    for (const value of values) {
        if (seen.has(value)) {
            return value;
        }
        seen.add(value);
    }
    return undefined;
}
