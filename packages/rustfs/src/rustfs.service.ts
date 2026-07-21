import {
    AbortMultipartUploadCommand,
    type AccessControlPolicy,
    type BucketCannedACL as AwsBucketCannedACL,
    type Type as AwsGranteeType,
    type ObjectCannedACL as AwsObjectCannedACL,
    type Permission as AwsPermission,
    type StorageClass as AwsStorageClass,
    CompleteMultipartUploadCommand,
    CopyObjectCommand,
    CreateBucketCommand,
    CreateMultipartUploadCommand,
    DeleteBucketCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    GetBucketAclCommand,
    GetObjectCommand,
    type GetObjectCommandInput,
    HeadBucketCommand,
    HeadObjectCommand,
    ListBucketsCommand,
    ListObjectsV2Command,
    ListPartsCommand,
    PutBucketAclCommand,
    PutObjectCommand,
    S3Client,
    type S3ClientConfig,
    UploadPartCommand,
} from '@aws-sdk/client-s3';
import { type PresignedPostOptions as AwsPresignedPostOptions, createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MODULE_OPTIONS_TOKEN } from './rustfs.module-definition';
import type {
    Bucket,
    BucketAcl,
    BucketCannedAcl,
    CompleteMultipartUploadOptions,
    CopyObjectOptions,
    CreateBucketOptions,
    CreateMultipartUploadOptions,
    GetObjectOptions,
    ListObjectsOptions,
    ListObjectsResult,
    ListPartsOptions,
    ListPartsResult,
    ObjectCannedAcl,
    PresignedPostOptions,
    PresignedUrlOptions,
    PutObjectOptions,
    RustFSPackageOptions,
    StorageClass,
    StorageObject,
    UploadPartOptions,
} from './rustfs.types';
import { BucketAlreadyExistsError, ObjectNotFoundError, RustFSError } from './rustfs.types';

const DEFAULT_PRESIGNED_URL_EXPIRATION_SECONDS = 3600;
const MAX_PRESIGNED_URL_EXPIRATION_SECONDS = 7 * 24 * 60 * 60;

function invalidConfiguration(message: string): RustFSError {
    return new RustFSError(message, 'INVALID_CONFIGURATION', 500);
}

function invalidPresignedOptions(message: string): RustFSError {
    return new RustFSError(message, 'INVALID_PRESIGNED_URL_OPTIONS', 400);
}

function assertPositiveInteger(name: string, value?: number): void {
    if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
        throw invalidConfiguration(`${name} must be a positive integer`);
    }
}

function resolvePresignedExpiration(expiresIn?: number): number {
    const expiration = expiresIn ?? DEFAULT_PRESIGNED_URL_EXPIRATION_SECONDS;

    if (!Number.isInteger(expiration) || expiration <= 0 || expiration > MAX_PRESIGNED_URL_EXPIRATION_SECONDS) {
        throw invalidPresignedOptions(
            `expiresIn must be an integer between 1 and ${MAX_PRESIGNED_URL_EXPIRATION_SECONDS} seconds`,
        );
    }

    return expiration;
}

function getBodySize(body?: Buffer | Uint8Array | string): number {
    if (body === undefined) {
        return 0;
    }

    return typeof body === 'string' ? Buffer.byteLength(body) : body.byteLength;
}

function applyGetObjectQueryParams(input: GetObjectCommandInput, queryParams?: Record<string, string>): void {
    for (const [name, value] of Object.entries(queryParams ?? {})) {
        switch (name) {
            case 'versionId':
                input.VersionId = value;
                break;
            case 'response-cache-control':
                input.ResponseCacheControl = value;
                break;
            case 'response-content-disposition':
                input.ResponseContentDisposition = value;
                break;
            case 'response-content-encoding':
                input.ResponseContentEncoding = value;
                break;
            case 'response-content-language':
                input.ResponseContentLanguage = value;
                break;
            case 'response-content-type':
                input.ResponseContentType = value;
                break;
            case 'response-expires': {
                const expires = new Date(value);
                if (Number.isNaN(expires.getTime())) {
                    throw invalidPresignedOptions('response-expires must be a valid date');
                }
                input.ResponseExpires = expires;
                break;
            }
            default:
                throw invalidPresignedOptions(`Unsupported signed query parameter: ${name}`);
        }
    }
}

function getDeleteObjectVersionId(queryParams?: Record<string, string>): string | undefined {
    const entries = Object.entries(queryParams ?? {});
    const unsupported = entries.find(([name]) => name !== 'versionId');
    if (unsupported) {
        throw invalidPresignedOptions(`Unsupported DELETE query parameter: ${unsupported[0]}`);
    }

    return queryParams?.versionId;
}

function toBucketAcl(acl?: BucketCannedAcl): AwsBucketCannedACL | undefined {
    return acl as AwsBucketCannedACL | undefined;
}

function toObjectAcl(acl?: ObjectCannedAcl): AwsObjectCannedACL | undefined {
    return acl as AwsObjectCannedACL | undefined;
}

function toStorageClass(storageClass?: StorageClass): AwsStorageClass | undefined {
    if (!storageClass) {
        return undefined;
    }

    if (storageClass === 'ONEZONE_INFREQUENT_ACCESS') {
        return 'ONEZONE_IA';
    }

    return storageClass as AwsStorageClass;
}

function fromStorageClass(storageClass?: string): StorageClass | undefined {
    if (!storageClass) {
        return undefined;
    }

    if (storageClass === 'ONEZONE_IA') {
        return 'ONEZONE_INFREQUENT_ACCESS';
    }

    return storageClass as StorageClass;
}

function toAwsGranteeType(type?: BucketAcl['grants'][number]['grantee']['type']): AwsGranteeType | undefined {
    switch (type) {
        case 'canonical':
            return 'CanonicalUser';
        case 'group':
            return 'Group';
        case 'email':
            return 'AmazonCustomerByEmail';
        default:
            return undefined;
    }
}

function fromAwsGranteeType(type?: string): BucketAcl['grants'][number]['grantee']['type'] {
    switch (type) {
        case 'CanonicalUser':
            return 'canonical';
        case 'Group':
            return 'group';
        case 'AmazonCustomerByEmail':
            return 'email';
        default:
            return 'canonical';
    }
}

function toAccessControlPolicy(acl: BucketAcl): AccessControlPolicy {
    return {
        Owner: { ID: acl.owner },
        Grants: acl.grants.map(grant => ({
            Grantee: {
                Type: toAwsGranteeType(grant.grantee.type),
                ID: grant.grantee.id,
                URI: grant.grantee.uri,
                EmailAddress: grant.grantee.emailAddress,
            },
            Permission: grant.permission as AwsPermission,
        })),
    };
}

function toPartNumberMarker(marker?: string): number | undefined {
    if (!marker) {
        return undefined;
    }

    const value = Number(marker);
    return Number.isFinite(value) ? value : undefined;
}

@Injectable()
export class RustFSServiceImpl implements OnModuleInit, OnModuleDestroy {
    private readonly client: S3Client;
    private readonly defaultBucket: string;
    private readonly inFlightRequests = new Set<Promise<unknown>>();
    private shuttingDown = false;
    private shutdownPromise?: Promise<void>;
    private readonly logger = new Logger(RustFSServiceImpl.name);

    constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly options: RustFSPackageOptions) {
        this.defaultBucket = options.bucket || '';
        this.client = this.createClient();
    }

    async onModuleInit() {
        if (this.defaultBucket) {
            const exists = await this.bucketExists(this.defaultBucket);
            if (!exists) {
                this.logger.warn(`Default bucket '${this.defaultBucket}' does not exist`);
            }
        }
        this.logger.log(`RustFS client initialized for endpoint: ${this.options.endpoint}`);
    }

    async onModuleDestroy(): Promise<void> {
        if (!this.shutdownPromise) {
            this.shuttingDown = true;
            this.shutdownPromise = this.destroyClient();
        }

        await this.shutdownPromise;
    }

    private async destroyClient(): Promise<void> {
        await Promise.allSettled([...this.inFlightRequests]);
        this.client.destroy();
    }

    private run<T>(operation: () => Promise<T>): Promise<T> {
        if (this.shuttingDown) {
            return Promise.reject(new RustFSError('RustFS client is shutting down', 'CLIENT_CLOSED', 503));
        }

        const request = Promise.resolve().then(operation);
        this.inFlightRequests.add(request);

        return request.finally(() => {
            this.inFlightRequests.delete(request);
        });
    }

    private createClient(): S3Client {
        let endpoint: URL;
        try {
            endpoint = new URL(this.options.endpoint);
        } catch {
            throw invalidConfiguration('endpoint must be an absolute HTTP or HTTPS URL');
        }

        if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') {
            throw invalidConfiguration('endpoint must use the HTTP or HTTPS protocol');
        }

        if (this.options.sslEnabled !== undefined && this.options.sslEnabled !== (endpoint.protocol === 'https:')) {
            throw invalidConfiguration('sslEnabled must match the endpoint URL protocol');
        }

        assertPositiveInteger('timeout', this.options.timeout);
        assertPositiveInteger('connectionTimeout', this.options.connectionTimeout);
        assertPositiveInteger('requestTimeout', this.options.requestTimeout);
        assertPositiveInteger('maxAttempts', this.options.maxAttempts);

        const config: S3ClientConfig = {
            endpoint: this.options.endpoint,
            region: this.options.region || 'us-east-1',
            credentials: {
                accessKeyId: this.options.accessKeyId,
                secretAccessKey: this.options.secretAccessKey,
            },
            forcePathStyle: this.options.forcePathStyle ?? true,
        };

        const connectionTimeout = this.options.connectionTimeout ?? this.options.timeout;
        const requestTimeout = this.options.requestTimeout ?? this.options.timeout;
        if (connectionTimeout !== undefined || requestTimeout !== undefined) {
            config.requestHandler = {
                connectionTimeout,
                requestTimeout,
                throwOnRequestTimeout: true,
            };
        }

        if (this.options.maxAttempts !== undefined) {
            config.maxAttempts = this.options.maxAttempts;
        }

        return new S3Client(config);
    }

    // =========================================================================
    // Bucket Operations
    // =========================================================================

    async createBucket(options: CreateBucketOptions): Promise<Bucket> {
        try {
            const command = new CreateBucketCommand({
                Bucket: options.name,
                ACL: toBucketAcl(options.acl),
            });

            await this.run(() => this.client.send(command));

            this.logger.log(`Bucket created: ${options.name}`);

            return {
                name: options.name,
                creationDate: new Date(),
            };
        } catch (error) {
            if (error instanceof RustFSError) {
                throw error;
            }

            const err = error as { name?: string; message?: string };
            if (err.name === 'BucketAlreadyOwnedByYou' || err.name === 'BucketAlreadyExists') {
                throw new BucketAlreadyExistsError(options.name);
            }
            throw new RustFSError(`Failed to create bucket: ${err.message}`, 'CREATE_BUCKET_ERROR', 500);
        }
    }

    async listBuckets(): Promise<Bucket[]> {
        const command = new ListBucketsCommand({});
        const response = await this.run(() => this.client.send(command));

        return (response.Buckets || []).map(b => ({
            name: b.Name || '',
            creationDate: b.CreationDate || new Date(),
        }));
    }

    async getBucketAcl(bucketName: string): Promise<BucketAcl> {
        const command = new GetBucketAclCommand({ Bucket: bucketName });
        const response = await this.run(() => this.client.send(command));

        return {
            owner: response.Owner?.ID || '',
            grants: (response.Grants || []).map(g => ({
                grantee: {
                    type: fromAwsGranteeType(g.Grantee?.Type),
                    id: g.Grantee?.ID,
                    uri: g.Grantee?.URI,
                    emailAddress: g.Grantee?.EmailAddress,
                },
                permission: g.Permission as BucketAcl['grants'][0]['permission'],
            })),
        };
    }

    async setBucketAcl(bucketName: string, acl: BucketAcl): Promise<void> {
        const command = new PutBucketAclCommand({
            Bucket: bucketName,
            AccessControlPolicy: toAccessControlPolicy(acl),
        });

        await this.run(() => this.client.send(command));
    }

    async deleteBucket(bucketName: string): Promise<void> {
        const command = new DeleteBucketCommand({ Bucket: bucketName });
        await this.run(() => this.client.send(command));
        this.logger.log(`Bucket deleted: ${bucketName}`);
    }

    async bucketExists(bucketName: string): Promise<boolean> {
        try {
            const command = new HeadBucketCommand({ Bucket: bucketName });
            await this.run(() => this.client.send(command));
            return true;
        } catch (error) {
            if (error instanceof RustFSError && error.code === 'CLIENT_CLOSED') {
                throw error;
            }
            return false;
        }
    }

    // =========================================================================
    // Object Operations
    // =========================================================================

    async putObject(bucketName: string, options: PutObjectOptions): Promise<StorageObject> {
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: options.key,
            Body: options.body,
            ContentType: options.contentType,
            ContentEncoding: options.contentEncoding,
            ContentDisposition: options.contentDisposition,
            ContentLanguage: options.contentLanguage,
            Metadata: options.metadata,
            ACL: toObjectAcl(options.acl),
            StorageClass: toStorageClass(options.storageClass),
            Expires: options.expires,
            CacheControl: options.cacheControl,
        });

        const response = await this.run(() => this.client.send(command));

        return {
            key: options.key,
            bucket: bucketName,
            etag: response.ETag || '',
            size: getBodySize(options.body),
            lastModified: new Date(),
            contentType: options.contentType,
            metadata: options.metadata,
            storageClass: options.storageClass,
            versionId: response.VersionId,
        };
    }

    async getObject(bucketName: string, options: GetObjectOptions): Promise<Buffer> {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: options.key,
            Range: options.range ? `bytes=${options.range.start}-${options.range.end}` : undefined,
            IfMatch: options.ifMatch,
            IfNoneMatch: options.ifNoneMatch,
            IfModifiedSince: options.ifModifiedSince,
            IfUnmodifiedSince: options.ifUnmodifiedSince,
        });

        try {
            return await this.run(async () => {
                const response = await this.client.send(command);
                const chunks: Uint8Array[] = [];

                if (response.Body) {
                    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
                        chunks.push(chunk);
                    }
                }

                return Buffer.concat(chunks);
            });
        } catch (error) {
            const err = error as { name?: string };
            if (err.name === 'NoSuchKey' || err.name === '404') {
                throw new ObjectNotFoundError(options.key, bucketName);
            }
            throw error;
        }
    }

    async getObjectMetadata(bucketName: string, key: string): Promise<StorageObject> {
        const command = new HeadObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        try {
            const response = await this.run(() => this.client.send(command));

            return {
                key,
                bucket: bucketName,
                etag: response.ETag || '',
                size: response.ContentLength || 0,
                lastModified: response.LastModified || new Date(),
                contentType: response.ContentType,
                metadata: response.Metadata || {},
                storageClass: fromStorageClass(response.StorageClass),
                versionId: response.VersionId,
            };
        } catch (error) {
            const err = error as { name?: string };
            if (err.name === 'NoSuchKey' || err.name === '404') {
                throw new ObjectNotFoundError(key, bucketName);
            }
            throw error;
        }
    }

    async copyObject(bucketName: string, options: CopyObjectOptions): Promise<StorageObject> {
        const sourceBucket = options.sourceBucket || bucketName;
        const destinationBucket = options.destinationBucket || bucketName;

        const command = new CopyObjectCommand({
            Bucket: destinationBucket,
            Key: options.destinationKey,
            CopySource: `/${sourceBucket}/${options.sourceKey}`,
            ACL: toObjectAcl(options.acl),
            Metadata: options.metadata,
            StorageClass: toStorageClass(options.storageClass),
        });

        const response = await this.run(() => this.client.send(command));

        return {
            key: options.destinationKey,
            bucket: destinationBucket,
            etag: response.CopyObjectResult?.ETag || '',
            size: 0,
            lastModified: new Date(),
            storageClass: options.storageClass,
            versionId: response.VersionId,
        };
    }

    async deleteObject(bucketName: string, key: string): Promise<void> {
        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        await this.run(() => this.client.send(command));
        this.logger.debug(`Object deleted: ${key} from ${bucketName}`);
    }

    async deleteObjects(bucketName: string, keys: string[]): Promise<void> {
        const command = new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: {
                Objects: keys.map(key => ({ Key: key })),
            },
        });

        const response = await this.run(() => this.client.send(command));

        if (response.Errors && response.Errors.length > 0) {
            this.logger.warn(`Failed to delete some objects: ${response.Errors.length}`);
        }
    }

    async listObjects(bucketName: string, options?: ListObjectsOptions): Promise<ListObjectsResult> {
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: options?.prefix,
            Delimiter: options?.delimiter,
            MaxKeys: options?.maxKeys || 1000,
            ContinuationToken: options?.continuationToken,
            StartAfter: options?.startAfter,
        });

        const response = await this.run(() => this.client.send(command));

        return {
            objects: (response.Contents || []).map(obj => ({
                key: obj.Key || '',
                bucket: bucketName,
                etag: obj.ETag || '',
                size: obj.Size || 0,
                lastModified: obj.LastModified || new Date(),
                storageClass: fromStorageClass(obj.StorageClass),
            })),
            prefixes: (response.CommonPrefixes || []).map(p => p.Prefix || ''),
            isTruncated: response.IsTruncated || false,
            nextContinuationToken: response.NextContinuationToken,
            keyCount: response.KeyCount || 0,
            maxKeys: response.MaxKeys || 1000,
        };
    }

    // =========================================================================
    // Presigned URLs
    // =========================================================================

    async getPresignedUrl(bucketName: string, options: PresignedUrlOptions): Promise<string> {
        const method = options.method ?? 'GET';
        let command: GetObjectCommand | PutObjectCommand | DeleteObjectCommand;

        switch (method) {
            case 'GET': {
                if (options.contentType) {
                    throw invalidPresignedOptions(
                        'contentType is only supported for PUT URLs; use response-content-type for GET URLs',
                    );
                }

                const input: GetObjectCommandInput = {
                    Bucket: bucketName,
                    Key: options.key,
                };
                applyGetObjectQueryParams(input, options.queryParams);
                command = new GetObjectCommand(input);
                break;
            }
            case 'PUT':
                if (options.queryParams && Object.keys(options.queryParams).length > 0) {
                    throw invalidPresignedOptions('queryParams are not supported for PUT URLs');
                }
                command = new PutObjectCommand({
                    Bucket: bucketName,
                    Key: options.key,
                    ContentType: options.contentType,
                });
                break;
            case 'DELETE':
                if (options.contentType) {
                    throw invalidPresignedOptions('contentType is not supported for DELETE URLs');
                }
                command = new DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: options.key,
                    VersionId: getDeleteObjectVersionId(options.queryParams),
                });
                break;
            default:
                throw invalidPresignedOptions(`Unsupported HTTP method: ${String(method)}`);
        }

        return this.run(() =>
            getSignedUrl(this.client, command, {
                expiresIn: resolvePresignedExpiration(options.expiresIn),
            }),
        );
    }

    async getPresignedPostUrl(
        bucketName: string,
        options: PresignedPostOptions,
    ): Promise<{ url: string; fields: Record<string, string> }> {
        const fields: Record<string, string> = {};
        const conditions: NonNullable<AwsPresignedPostOptions['Conditions']> = [];
        const contentLengthRange = options.conditions?.contentLengthRange;

        if (contentLengthRange) {
            const { min, max } = contentLengthRange;
            if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max < min) {
                throw invalidPresignedOptions('contentLengthRange must use integers where 0 <= min <= max');
            }
            conditions.push(['content-length-range', min, max]);
        }

        if (options.conditions?.contentType) {
            fields['Content-Type'] = options.conditions.contentType;
            conditions.push({ 'Content-Type': options.conditions.contentType });
        }

        if (options.conditions?.acl) {
            fields.acl = options.conditions.acl;
            conditions.push({ acl: options.conditions.acl });
        }

        return this.run(() =>
            createPresignedPost(this.client, {
                Bucket: bucketName,
                Key: options.key,
                Expires: resolvePresignedExpiration(options.expiresIn),
                Fields: fields,
                Conditions: conditions,
            }),
        );
    }

    // =========================================================================
    // Multipart Upload
    // =========================================================================

    async createMultipartUpload(bucketName: string, options: CreateMultipartUploadOptions): Promise<string> {
        const command = new CreateMultipartUploadCommand({
            Bucket: bucketName,
            Key: options.key,
            ContentType: options.contentType,
            Metadata: options.metadata,
            ACL: toObjectAcl(options.acl),
            StorageClass: toStorageClass(options.storageClass),
        });

        const response = await this.run(() => this.client.send(command));

        if (!response.UploadId) {
            throw new RustFSError('Failed to create multipart upload', 'MULTIPART_UPLOAD_ERROR');
        }

        return response.UploadId;
    }

    async uploadPart(bucketName: string, options: UploadPartOptions): Promise<string> {
        const command = new UploadPartCommand({
            Bucket: bucketName,
            Key: options.key,
            UploadId: options.uploadId,
            PartNumber: options.partNumber,
            Body: options.body,
            ContentLength: options.contentLength,
        });

        const response = await this.run(() => this.client.send(command));

        return response.ETag || '';
    }

    async completeMultipartUpload(bucketName: string, options: CompleteMultipartUploadOptions): Promise<StorageObject> {
        const command = new CompleteMultipartUploadCommand({
            Bucket: bucketName,
            Key: options.key,
            UploadId: options.uploadId,
            MultipartUpload: {
                Parts: options.parts.map(p => ({
                    PartNumber: p.partNumber,
                    ETag: p.etag,
                })),
            },
        });

        const response = await this.run(() => this.client.send(command));

        return {
            key: options.key,
            bucket: bucketName,
            etag: response.ETag || '',
            size: 0,
            lastModified: new Date(),
        };
    }

    async abortMultipartUpload(bucketName: string, key: string, uploadId: string): Promise<void> {
        const command = new AbortMultipartUploadCommand({
            Bucket: bucketName,
            Key: key,
            UploadId: uploadId,
        });

        await this.run(() => this.client.send(command));
    }

    async listParts(bucketName: string, options: ListPartsOptions): Promise<ListPartsResult> {
        const command = new ListPartsCommand({
            Bucket: bucketName,
            Key: options.key,
            UploadId: options.uploadId,
            MaxParts: options.maxParts,
            PartNumberMarker: options.partNumberMarker?.toString(),
        });

        const response = await this.run(() => this.client.send(command));

        return {
            key: options.key,
            uploadId: options.uploadId,
            parts: (response.Parts || []).map(p => ({
                partNumber: p.PartNumber || 0,
                etag: p.ETag || '',
                checksumSHA256: p.ChecksumSHA256,
            })),
            isTruncated: response.IsTruncated || false,
            nextPartNumberMarker: toPartNumberMarker(response.NextPartNumberMarker),
            maxParts: response.MaxParts || 1000,
        };
    }

    // =========================================================================
    // Health Check
    // =========================================================================

    async isHealthy(): Promise<boolean> {
        try {
            const command = new ListBucketsCommand({});
            await this.run(() => this.client.send(command));
            return true;
        } catch {
            return false;
        }
    }
}

// Re-export types for convenience
export type { RustFSModuleOptions } from './rustfs.types';
export { RustFSError } from './rustfs.types';
