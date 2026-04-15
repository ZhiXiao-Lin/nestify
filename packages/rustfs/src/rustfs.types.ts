// ============================================================================
// RustFS Types - S3-compatible storage
// ============================================================================

export interface RustFSPackageOptions {
    endpoint: string;
    region?: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket?: string;
    forcePathStyle?: boolean;
    sslEnabled?: boolean;
    timeout?: number;
    maxAttempts?: number;
}

/** @deprecated Use RustFSPackageOptions instead */
export type RustFSModuleOptions = RustFSPackageOptions;

// ============================================================================
// Bucket Types
// ============================================================================

export interface Bucket {
    name: string;
    creationDate: Date;
}

export interface CreateBucketOptions {
    name: string;
    acl?: BucketCannedAcl;
    region?: string;
}

export type BucketCannedAcl =
    | 'private'
    | 'public-read'
    | 'public-read-write'
    | 'authenticated-read'
    | 'log-delivery-write';

export interface BucketAcl {
    owner: string;
    grants: BucketGrant[];
}

export interface BucketGrant {
    grantee: Grantee;
    permission: BucketPermission;
}

export interface Grantee {
    type: 'canonical' | 'group' | 'email';
    id?: string;
    uri?: string;
    emailAddress?: string;
}

export type BucketPermission = 'READ' | 'WRITE' | 'READ_ACP' | 'WRITE_ACP' | 'FULL_CONTROL';

// ============================================================================
// Object Types
// ============================================================================

export interface StorageObject {
    key: string;
    bucket: string;
    etag: string;
    size: number;
    lastModified: Date;
    contentType?: string;
    metadata?: Record<string, string>;
    storageClass?: StorageClass;
    versionId?: string;
}

export type StorageClass =
    | 'STANDARD'
    | 'REDUCED_REDUNDANCY'
    | 'GLACIER'
    | 'DEEP_ARCHIVE'
    | 'INTELLIGENT_TIERING'
    | 'ONEZONE_INFREQUENT_ACCESS';

export interface PutObjectOptions {
    key: string;
    body?: Buffer | Uint8Array | string;
    contentType?: string;
    contentEncoding?: string;
    contentDisposition?: string;
    contentLanguage?: string;
    metadata?: Record<string, string>;
    acl?: ObjectCannedAcl;
    storageClass?: StorageClass;
    expires?: Date;
    cacheControl?: string;
}

export type ObjectCannedAcl =
    | 'private'
    | 'public-read'
    | 'public-read-write'
    | 'authenticated-read'
    | 'aws-exec-read'
    | 'bucket-owner-read'
    | 'bucket-owner-full-control';

export interface GetObjectOptions {
    key: string;
    range?: {
        start: number;
        end: number;
    };
    ifMatch?: string;
    ifNoneMatch?: string;
    ifModifiedSince?: Date;
    ifUnmodifiedSince?: Date;
}

export interface CopyObjectOptions {
    sourceKey: string;
    destinationKey: string;
    sourceBucket?: string;
    destinationBucket?: string;
    acl?: ObjectCannedAcl;
    metadata?: Record<string, string>;
    storageClass?: StorageClass;
}

export interface ListObjectsOptions {
    prefix?: string;
    delimiter?: string;
    maxKeys?: number;
    continuationToken?: string;
    startAfter?: string;
    includeOwn?: boolean;
}

export interface ListObjectsResult {
    objects: StorageObject[];
    prefixes: string[];
    isTruncated: boolean;
    nextContinuationToken?: string;
    keyCount: number;
    maxKeys: number;
}

// ============================================================================
// Presigned URL Types
// ============================================================================

export interface PresignedUrlOptions {
    key: string;
    expiresIn?: number;
    method?: 'GET' | 'PUT' | 'DELETE' | 'POST';
    contentType?: string;
    queryParams?: Record<string, string>;
}

export interface PresignedPostOptions {
    key: string;
    expiresIn?: number;
    conditions?: {
        contentLengthRange?: {
            min: number;
            max: number;
        };
        contentType?: string;
        acl?: ObjectCannedAcl;
    };
}

// ============================================================================
// Multipart Upload Types
// ============================================================================

export interface CreateMultipartUploadOptions {
    key: string;
    contentType?: string;
    metadata?: Record<string, string>;
    acl?: ObjectCannedAcl;
    storageClass?: StorageClass;
}

export interface UploadPartOptions {
    key: string;
    uploadId: string;
    partNumber: number;
    body?: Buffer | Uint8Array | string;
    contentLength?: number;
    checksumSHA256?: string;
}

export interface CompleteMultipartUploadOptions {
    key: string;
    uploadId: string;
    parts: UploadPart[];
}

export interface UploadPart {
    partNumber: number;
    etag: string;
    checksumSHA256?: string;
}

export interface ListPartsOptions {
    key: string;
    uploadId: string;
    maxParts?: number;
    partNumberMarker?: number;
}

export interface ListPartsResult {
    key: string;
    uploadId: string;
    parts: UploadPart[];
    isTruncated: boolean;
    nextPartNumberMarker?: number;
    maxParts: number;
}

// ============================================================================
// Service Types
// ============================================================================

export interface RustFSService {
    // Bucket operations
    createBucket(options: CreateBucketOptions): Promise<Bucket>;
    listBuckets(): Promise<Bucket[]>;
    getBucketAcl(bucketName: string): Promise<BucketAcl>;
    setBucketAcl(bucketName: string, acl: BucketAcl): Promise<void>;
    deleteBucket(bucketName: string): Promise<void>;
    bucketExists(bucketName: string): Promise<boolean>;

    // Object operations
    putObject(bucketName: string, options: PutObjectOptions): Promise<StorageObject>;
    getObject(bucketName: string, options: GetObjectOptions): Promise<Buffer>;
    getObjectMetadata(bucketName: string, key: string): Promise<StorageObject>;
    copyObject(bucketName: string, options: CopyObjectOptions): Promise<StorageObject>;
    deleteObject(bucketName: string, key: string): Promise<void>;
    deleteObjects(bucketName: string, keys: string[]): Promise<void>;
    listObjects(bucketName: string, options?: ListObjectsOptions): Promise<ListObjectsResult>;

    // Presigned URLs
    getPresignedUrl(bucketName: string, options: PresignedUrlOptions): Promise<string>;
    getPresignedPostUrl(bucketName: string, options: PresignedPostOptions): Promise<{
        url: string;
        fields: Record<string, string>;
    }>;

    // Multipart upload
    createMultipartUpload(bucketName: string, options: CreateMultipartUploadOptions): Promise<string>;
    uploadPart(bucketName: string, options: UploadPartOptions): Promise<string>;
    completeMultipartUpload(bucketName: string, options: CompleteMultipartUploadOptions): Promise<StorageObject>;
    abortMultipartUpload(bucketName: string, key: string, uploadId: string): Promise<void>;
    listParts(bucketName: string, options: ListPartsOptions): Promise<ListPartsResult>;

    // Health check
    isHealthy(): Promise<boolean>;
}

// ============================================================================
// Errors
// ============================================================================

export class RustFSError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 500,
    ) {
        super(message);
        this.name = 'RustFSError';
    }
}

export class BucketNotFoundError extends RustFSError {
    constructor(bucketName: string) {
        super(
            `Bucket not found: ${bucketName}`,
            'BUCKET_NOT_FOUND',
            404,
        );
    }
}

export class ObjectNotFoundError extends RustFSError {
    constructor(key: string, bucketName: string) {
        super(
            `Object not found: ${key} in ${bucketName}`,
            'OBJECT_NOT_FOUND',
            404,
        );
    }
}

export class BucketAlreadyExistsError extends RustFSError {
    constructor(bucketName: string) {
        super(
            `Bucket already exists: ${bucketName}`,
            'BUCKET_ALREADY_EXISTS',
            409,
        );
    }
}

export class InvalidAccessKeyIdError extends RustFSError {
    constructor() {
        super(
            'Invalid access key ID',
            'INVALID_ACCESS_KEY_ID',
            403,
        );
    }
}

export class SignatureDoesNotMatchError extends RustFSError {
    constructor() {
        super(
            'Signature does not match',
            'SIGNATURE_DOES_NOT_MATCH',
            403,
        );
    }
}

export class RegionMismatchError extends RustFSError {
    constructor(expected: string, actual: string) {
        super(
            `Region mismatch: expected ${expected}, got ${actual}`,
            'REGION_MISMATCH',
            400,
        );
    }
}
