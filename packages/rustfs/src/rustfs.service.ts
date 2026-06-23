import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
    S3Client,
    CreateBucketCommand,
    ListBucketsCommand,
    DeleteBucketCommand,
    HeadBucketCommand,
    GetObjectCommand,
    PutObjectCommand,
    CopyObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    ListObjectsV2Command,
    HeadObjectCommand,
    GetBucketAclCommand,
    PutBucketAclCommand,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
    ListPartsCommand,
    type AccessControlPolicy,
    type BucketCannedACL as AwsBucketCannedACL,
    type ObjectCannedACL as AwsObjectCannedACL,
    type Permission as AwsPermission,
    type S3ClientConfig,
    type StorageClass as AwsStorageClass,
    type Type as AwsGranteeType,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
    RustFSPackageOptions,
    Bucket,
    CreateBucketOptions,
    BucketCannedAcl,
    BucketAcl,
    StorageObject,
    PutObjectOptions,
    ObjectCannedAcl,
    GetObjectOptions,
    CopyObjectOptions,
    ListObjectsOptions,
    ListObjectsResult,
    PresignedUrlOptions,
    PresignedPostOptions,
    CreateMultipartUploadOptions,
    UploadPartOptions,
    CompleteMultipartUploadOptions,
    ListPartsOptions,
    ListPartsResult,
    StorageClass,
    RustFSError,
    ObjectNotFoundError,
    BucketAlreadyExistsError,
} from './rustfs.types';

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
export class RustFSServiceImpl implements OnModuleInit {
    private client: S3Client;
    private defaultBucket: string;
    private readonly logger = new Logger(RustFSServiceImpl.name);

    constructor(private readonly options: RustFSPackageOptions) {
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

    private createClient(): S3Client {
        const config: Record<string, unknown> = {
            endpoint: this.options.endpoint,
            region: this.options.region || 'us-east-1',
            credentials: {
                accessKeyId: this.options.accessKeyId,
                secretAccessKey: this.options.secretAccessKey,
            },
            forcePathStyle: this.options.forcePathStyle ?? true,
        };

        if (this.options.sslEnabled !== false) {
            config.tls = true;
        }

        if (this.options.timeout) {
            config.requestTimeout = this.options.timeout;
        }

        if (this.options.maxAttempts) {
            config.maxAttempts = this.options.maxAttempts;
        }

        return new S3Client(config as S3ClientConfig);
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

            await this.client.send(command);

            this.logger.log(`Bucket created: ${options.name}`);

            return {
                name: options.name,
                creationDate: new Date(),
            };
        } catch (error) {
            const err = error as { name?: string; message?: string };
            if (err.name === 'BucketAlreadyOwnedByYou' || err.name === 'BucketAlreadyExists') {
                throw new BucketAlreadyExistsError(options.name);
            }
            throw new RustFSError(`Failed to create bucket: ${err.message}`, 'CREATE_BUCKET_ERROR', 500);
        }
    }

    async listBuckets(): Promise<Bucket[]> {
        const command = new ListBucketsCommand({});
        const response = await this.client.send(command);

        return (response.Buckets || []).map(b => ({
            name: b.Name || '',
            creationDate: b.CreationDate || new Date(),
        }));
    }

    async getBucketAcl(bucketName: string): Promise<BucketAcl> {
        const command = new GetBucketAclCommand({ Bucket: bucketName });
        const response = await this.client.send(command);

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

        await this.client.send(command);
    }

    async deleteBucket(bucketName: string): Promise<void> {
        const command = new DeleteBucketCommand({ Bucket: bucketName });
        await this.client.send(command);
        this.logger.log(`Bucket deleted: ${bucketName}`);
    }

    async bucketExists(bucketName: string): Promise<boolean> {
        try {
            const command = new HeadBucketCommand({ Bucket: bucketName });
            await this.client.send(command);
            return true;
        } catch {
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

        const response = await this.client.send(command);

        return {
            key: options.key,
            bucket: bucketName,
            etag: response.ETag || '',
            size: response.$metadata?.httpStatusCode || 0,
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
            const response = await this.client.send(command);
            const chunks: Uint8Array[] = [];

            if (response.Body) {
                for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
                    chunks.push(chunk);
                }
            }

            return Buffer.concat(chunks);
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
            const response = await this.client.send(command);

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

        const response = await this.client.send(command);

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

        await this.client.send(command);
        this.logger.debug(`Object deleted: ${key} from ${bucketName}`);
    }

    async deleteObjects(bucketName: string, keys: string[]): Promise<void> {
        const command = new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: {
                Objects: keys.map(key => ({ Key: key })),
            },
        });

        const response = await this.client.send(command);

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

        const response = await this.client.send(command);

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
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: options.key,
            ...(options.contentType && { ContentType: options.contentType }),
        });

        const url = await getSignedUrl(this.client, command, {
            expiresIn: options.expiresIn || 3600,
        });

        return url;
    }

    async getPresignedPostUrl(
        bucketName: string,
        options: PresignedPostOptions,
    ): Promise<{ url: string; fields: Record<string, string> }> {
        // Note: Presigned POST requires additional implementation
        // For now, return a simple presigned PUT URL as alternative
        const url = await this.getPresignedUrl(bucketName, {
            key: options.key,
            expiresIn: options.expiresIn || 3600,
            method: 'PUT',
            contentType: options.conditions?.contentType,
        });

        return {
            url,
            fields: {
                'Content-Type': options.conditions?.contentType || 'application/octet-stream',
            },
        };
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

        const response = await this.client.send(command);

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

        const response = await this.client.send(command);

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

        const response = await this.client.send(command);

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

        await this.client.send(command);
    }

    async listParts(bucketName: string, options: ListPartsOptions): Promise<ListPartsResult> {
        const command = new ListPartsCommand({
            Bucket: bucketName,
            Key: options.key,
            UploadId: options.uploadId,
            MaxParts: options.maxParts,
            PartNumberMarker: options.partNumberMarker?.toString(),
        });

        const response = await this.client.send(command);

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
            await this.client.send(command);
            return true;
        } catch {
            return false;
        }
    }
}

// Re-export types for convenience
export type { RustFSModuleOptions } from './rustfs.types';
export { RustFSError } from './rustfs.types';
