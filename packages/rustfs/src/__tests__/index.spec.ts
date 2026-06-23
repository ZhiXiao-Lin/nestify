import { MODULE_OPTIONS_TOKEN } from '../rustfs.module-definition';
import { RustFSModule } from '../rustfs.module';
import { ObjectNotFoundError } from '../rustfs.types';
import { RustFSService, RustFSServiceImpl } from '../index';

const mockSend = jest.fn();
const mockS3Client = jest.fn();
const mockGetSignedUrl = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
    const createCommand = (commandName: string) =>
        jest.fn().mockImplementation((input: Record<string, unknown>) => ({
            commandName,
            input,
        }));

    return {
        S3Client: jest.fn().mockImplementation((config: Record<string, unknown>) => {
            mockS3Client(config);
            return {
                config,
                send: mockSend,
            };
        }),
        CreateBucketCommand: createCommand('CreateBucketCommand'),
        ListBucketsCommand: createCommand('ListBucketsCommand'),
        DeleteBucketCommand: createCommand('DeleteBucketCommand'),
        HeadBucketCommand: createCommand('HeadBucketCommand'),
        GetObjectCommand: createCommand('GetObjectCommand'),
        PutObjectCommand: createCommand('PutObjectCommand'),
        CopyObjectCommand: createCommand('CopyObjectCommand'),
        DeleteObjectCommand: createCommand('DeleteObjectCommand'),
        DeleteObjectsCommand: createCommand('DeleteObjectsCommand'),
        ListObjectsV2Command: createCommand('ListObjectsV2Command'),
        HeadObjectCommand: createCommand('HeadObjectCommand'),
        GetBucketAclCommand: createCommand('GetBucketAclCommand'),
        PutBucketAclCommand: createCommand('PutBucketAclCommand'),
        CreateMultipartUploadCommand: createCommand('CreateMultipartUploadCommand'),
        UploadPartCommand: createCommand('UploadPartCommand'),
        CompleteMultipartUploadCommand: createCommand('CompleteMultipartUploadCommand'),
        AbortMultipartUploadCommand: createCommand('AbortMultipartUploadCommand'),
        ListPartsCommand: createCommand('ListPartsCommand'),
    };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

async function* chunks(...values: string[]) {
    for (const value of values) {
        yield Buffer.from(value);
    }
}

function findCommand(commandName: string) {
    return mockSend.mock.calls.map(([command]) => command).find(command => command.commandName === commandName);
}

describe('rustfs package', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetSignedUrl.mockResolvedValue('https://storage.example/presigned');
        mockSend.mockImplementation(async command => {
            switch (command.commandName) {
                case 'ListBucketsCommand':
                    return {
                        Buckets: [{ Name: 'objects', CreationDate: new Date('2026-01-01T00:00:00.000Z') }],
                    };
                case 'PutObjectCommand':
                    return { ETag: '"etag-1"', VersionId: 'version-1', $metadata: { httpStatusCode: 200 } };
                case 'GetObjectCommand':
                    if (command.input.Key === 'missing.txt') {
                        const error = new Error('missing') as Error & { name: string };
                        error.name = 'NoSuchKey';
                        throw error;
                    }
                    return { Body: chunks('hello ', 'world') };
                case 'HeadObjectCommand':
                    return {
                        ETag: '"etag-1"',
                        ContentLength: 11,
                        LastModified: new Date('2026-01-02T00:00:00.000Z'),
                        ContentType: 'text/plain',
                        Metadata: { source: 'api' },
                        StorageClass: 'ONEZONE_IA',
                    };
                case 'ListObjectsV2Command':
                    return {
                        Contents: [
                            {
                                Key: 'resources/file.txt',
                                ETag: '"etag-1"',
                                Size: 11,
                                LastModified: new Date('2026-01-02T00:00:00.000Z'),
                                StorageClass: 'ONEZONE_IA',
                            },
                        ],
                        CommonPrefixes: [{ Prefix: 'resources/' }],
                        IsTruncated: true,
                        NextContinuationToken: 'next-token',
                        KeyCount: 1,
                        MaxKeys: 10,
                    };
                case 'CreateMultipartUploadCommand':
                    return { UploadId: 'upload-1' };
                case 'UploadPartCommand':
                    return { ETag: '"part-1"' };
                case 'CompleteMultipartUploadCommand':
                    return { ETag: '"complete-1"' };
                case 'ListPartsCommand':
                    return {
                        Parts: [{ PartNumber: 1, ETag: '"part-1"', ChecksumSHA256: 'checksum-1' }],
                        IsTruncated: true,
                        NextPartNumberMarker: '2',
                        MaxParts: 100,
                    };
                default:
                    return {};
            }
        });
    });

    it('exports stable service names and module registrations', () => {
        const options = {
            endpoint: 'http://storage:9000',
            accessKeyId: 'access-key',
            secretAccessKey: 'secret-key',
        };
        const staticModule = RustFSModule.register(options);
        const asyncModule = RustFSModule.registerAsync({
            useFactory: () => options,
        });

        expect(RustFSService).toBe(RustFSServiceImpl);
        expect(staticModule.module).toBe(RustFSModule);
        expect(staticModule.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ provide: MODULE_OPTIONS_TOKEN, useValue: options }),
                RustFSServiceImpl,
            ]),
        );
        expect(asyncModule.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ provide: MODULE_OPTIONS_TOKEN, useFactory: expect.any(Function) }),
                RustFSServiceImpl,
            ]),
        );
    });

    it('creates an S3-compatible client and manages buckets', async () => {
        const service = new RustFSServiceImpl({
            endpoint: 'http://storage:9000',
            accessKeyId: 'access-key',
            secretAccessKey: 'secret-key',
            sslEnabled: false,
            timeout: 3000,
            maxAttempts: 2,
        });

        const bucket = await service.createBucket({ name: 'objects', acl: 'private' });
        const buckets = await service.listBuckets();
        const healthy = await service.isHealthy();

        expect(mockS3Client).toHaveBeenCalledWith(
            expect.objectContaining({
                endpoint: 'http://storage:9000',
                region: 'us-east-1',
                credentials: {
                    accessKeyId: 'access-key',
                    secretAccessKey: 'secret-key',
                },
                forcePathStyle: true,
                requestTimeout: 3000,
                maxAttempts: 2,
            }),
        );
        expect(mockS3Client.mock.calls[0][0]).not.toHaveProperty('tls');
        expect(findCommand('CreateBucketCommand').input).toEqual({
            Bucket: 'objects',
            ACL: 'private',
        });
        expect(bucket).toMatchObject({ name: 'objects' });
        expect(buckets).toEqual([{ name: 'objects', creationDate: new Date('2026-01-01T00:00:00.000Z') }]);
        expect(healthy).toBe(true);
    });

    it('stores, reads, lists, and maps object metadata', async () => {
        const service = new RustFSServiceImpl({
            endpoint: 'http://storage:9000',
            accessKeyId: 'access-key',
            secretAccessKey: 'secret-key',
        });

        const stored = await service.putObject('objects', {
            key: 'resources/file.txt',
            body: 'hello world',
            contentType: 'text/plain',
            metadata: { source: 'api' },
            storageClass: 'ONEZONE_INFREQUENT_ACCESS',
        });
        const body = await service.getObject('objects', { key: 'resources/file.txt' });
        const metadata = await service.getObjectMetadata('objects', 'resources/file.txt');
        const listed = await service.listObjects('objects', { prefix: 'resources/', maxKeys: 10 });

        expect(findCommand('PutObjectCommand').input).toMatchObject({
            Bucket: 'objects',
            Key: 'resources/file.txt',
            Body: 'hello world',
            ContentType: 'text/plain',
            Metadata: { source: 'api' },
            StorageClass: 'ONEZONE_IA',
        });
        expect(stored).toMatchObject({
            key: 'resources/file.txt',
            bucket: 'objects',
            etag: '"etag-1"',
            versionId: 'version-1',
        });
        expect(body.toString('utf8')).toBe('hello world');
        expect(metadata).toMatchObject({
            key: 'resources/file.txt',
            bucket: 'objects',
            size: 11,
            contentType: 'text/plain',
            storageClass: 'ONEZONE_INFREQUENT_ACCESS',
        });
        expect(listed).toMatchObject({
            prefixes: ['resources/'],
            isTruncated: true,
            nextContinuationToken: 'next-token',
            keyCount: 1,
            maxKeys: 10,
        });
        expect(listed.objects[0]).toMatchObject({
            key: 'resources/file.txt',
            storageClass: 'ONEZONE_INFREQUENT_ACCESS',
        });
    });

    it('maps missing objects to package errors', async () => {
        const service = new RustFSServiceImpl({
            endpoint: 'http://storage:9000',
            accessKeyId: 'access-key',
            secretAccessKey: 'secret-key',
        });

        await expect(service.getObject('objects', { key: 'missing.txt' })).rejects.toBeInstanceOf(ObjectNotFoundError);
        await expect(service.getObject('objects', { key: 'missing.txt' })).rejects.toMatchObject({
            code: 'OBJECT_NOT_FOUND',
            statusCode: 404,
        });
    });

    it('creates presigned URLs and handles multipart uploads', async () => {
        const service = new RustFSServiceImpl({
            endpoint: 'http://storage:9000',
            accessKeyId: 'access-key',
            secretAccessKey: 'secret-key',
        });

        const url = await service.getPresignedUrl('objects', {
            key: 'resources/file.txt',
            expiresIn: 900,
            contentType: 'text/plain',
        });
        const uploadId = await service.createMultipartUpload('objects', {
            key: 'resources/file.txt',
            contentType: 'text/plain',
            storageClass: 'ONEZONE_INFREQUENT_ACCESS',
        });
        const partEtag = await service.uploadPart('objects', {
            key: 'resources/file.txt',
            uploadId,
            partNumber: 1,
            body: 'hello',
            contentLength: 5,
        });
        const completed = await service.completeMultipartUpload('objects', {
            key: 'resources/file.txt',
            uploadId,
            parts: [{ partNumber: 1, etag: partEtag }],
        });
        const parts = await service.listParts('objects', {
            key: 'resources/file.txt',
            uploadId,
            maxParts: 100,
            partNumberMarker: 1,
        });

        expect(url).toBe('https://storage.example/presigned');
        expect(mockGetSignedUrl).toHaveBeenCalledWith(
            expect.objectContaining({ send: mockSend }),
            expect.objectContaining({
                commandName: 'GetObjectCommand',
                input: expect.objectContaining({
                    Bucket: 'objects',
                    Key: 'resources/file.txt',
                    ContentType: 'text/plain',
                }),
            }),
            { expiresIn: 900 },
        );
        expect(findCommand('CreateMultipartUploadCommand').input).toMatchObject({
            Bucket: 'objects',
            Key: 'resources/file.txt',
            ContentType: 'text/plain',
            StorageClass: 'ONEZONE_IA',
        });
        expect(partEtag).toBe('"part-1"');
        expect(completed).toMatchObject({
            key: 'resources/file.txt',
            bucket: 'objects',
            etag: '"complete-1"',
        });
        expect(parts).toEqual({
            key: 'resources/file.txt',
            uploadId: 'upload-1',
            parts: [{ partNumber: 1, etag: '"part-1"', checksumSHA256: 'checksum-1' }],
            isTruncated: true,
            nextPartNumberMarker: 2,
            maxParts: 100,
        });
    });
});
