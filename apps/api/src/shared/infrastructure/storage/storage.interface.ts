// ============================================================================
// Storage Infrastructure Interface
// ============================================================================

import type { Bucket, StorageObject, CreateBucketOptions, BucketAcl, ListObjectsResult } from '@a3s-lab/rustfs';

export interface IStorageService {
    // Bucket operations
    createBucket(options: CreateBucketOptions): Promise<Bucket>;
    listBuckets(): Promise<Bucket[]>;
    getBucketAcl(bucketName: string): Promise<BucketAcl>;
    setBucketAcl(bucketName: string, acl: BucketAcl): Promise<void>;
    deleteBucket(bucketName: string): Promise<void>;
    bucketExists(bucketName: string): Promise<boolean>;

    // Object operations
    putObject(bucketName: string, options: {
        key: string;
        body?: Buffer | Uint8Array | string;
        contentType?: string;
        contentEncoding?: string;
        contentDisposition?: string;
        contentLanguage?: string;
        metadata?: Record<string, string>;
        acl?: string;
        storageClass?: string;
        expires?: Date;
        cacheControl?: string;
    }): Promise<StorageObject>;
    getObject(bucketName: string, options: {
        key: string;
        range?: { start: number; end: number };
        ifMatch?: string;
        ifNoneMatch?: string;
        ifModifiedSince?: Date;
        ifUnmodifiedSince?: Date;
    }): Promise<Buffer>;
    getObjectMetadata(bucketName: string, key: string): Promise<StorageObject>;
    copyObject(bucketName: string, options: {
        sourceKey: string;
        destinationKey: string;
        sourceBucket?: string;
        destinationBucket?: string;
        acl?: string;
        metadata?: Record<string, string>;
        storageClass?: string;
    }): Promise<StorageObject>;
    deleteObject(bucketName: string, key: string): Promise<void>;
    deleteObjects(bucketName: string, keys: string[]): Promise<void>;
    listObjects(bucketName: string, options?: {
        prefix?: string;
        delimiter?: string;
        maxKeys?: number;
        continuationToken?: string;
        startAfter?: string;
        includeOwn?: boolean;
    }): Promise<ListObjectsResult>;

    // Presigned URLs
    getPresignedUrl(bucketName: string, options: {
        key: string;
        expiresIn?: number;
        method?: 'GET' | 'PUT' | 'DELETE' | 'POST';
        contentType?: string;
        queryParams?: Record<string, string>;
    }): Promise<string>;
    getPresignedPostUrl(bucketName: string, options: {
        key: string;
        expiresIn?: number;
        conditions?: {
            contentLengthRange?: { min: number; max: number };
            contentType?: string;
            acl?: string;
        };
    }): Promise<{ url: string; fields: Record<string, string> }>;

    // Health check
    isHealthy(): Promise<boolean>;
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
