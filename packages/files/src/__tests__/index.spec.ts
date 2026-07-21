import 'reflect-metadata';
import { BadRequestException, Module } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { NestFactory, Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import {
    extractFiles,
    FILE_STORAGE_CLIENT,
    FILE_UPLOAD_OPTIONS,
    FileBatchUploadError,
    FileCleanupError,
    type FileStorageClient,
    FileUpload,
    FileUploadInterceptor,
    type FileUploadMetadata,
    FileUploadModule,
    FileUploadService,
    SingleFileUploadInterceptor,
    UploadedFile,
    UploadedFiles,
} from '../index';

describe('file upload package', () => {
    it('uploads files through the configured storage client', async () => {
        const storage = createStorageClient();
        const service = new FileUploadService(storage, {
            keyPrefix: 'incoming',
            signedUrlExpiresInSeconds: 60,
            storedNameFactory: input => `${input.size}-${input.originalName}`,
        });

        const result = await service.uploadFile(Buffer.from('hello'), 'note.txt', 'Text/Plain; charset=utf-8', {
            allowedExtensions: ['txt'],
        });

        expect(storage.upload).toHaveBeenCalledWith('incoming/5-note.txt', Buffer.from('hello'), {
            contentType: 'text/plain',
        });
        expect(storage.getSignedUrl).toHaveBeenCalledWith('incoming/5-note.txt', 60);
        expect(result).toMatchObject({
            originalName: 'note.txt',
            storedName: '5-note.txt',
            mimeType: 'text/plain',
            size: 5,
            key: 'incoming/5-note.txt',
            url: 'signed-url',
        });
    });

    it('validates size, type, extension, and batch count before upload', async () => {
        const storage = createStorageClient();
        const service = new FileUploadService(storage, { maxFiles: 3, validation: { maxCount: 2 } });

        await expect(service.uploadFile(Buffer.alloc(5), 'note.txt', 'text/plain', { maxSize: 4 })).rejects.toThrow(
            BadRequestException,
        );
        await expect(
            service.uploadFile(Buffer.alloc(1), 'note.txt', 'text/plain', { allowedTypes: ['application/pdf'] }),
        ).rejects.toThrow(BadRequestException);
        await expect(
            service.uploadFile(Buffer.alloc(1), 'note.exe', 'text/plain', { allowedExtensions: ['.txt'] }),
        ).rejects.toThrow(BadRequestException);
        await expect(
            service.uploadFiles([uploadInput('one.txt'), uploadInput('two.txt'), uploadInput('three.txt')]),
        ).rejects.toThrow('File count exceeds maximum allowed (2)');
        await expect(service.uploadFiles([])).resolves.toEqual([]);
        expect(storage.upload).not.toHaveBeenCalled();
    });

    it('rejects unsafe logical object paths', async () => {
        const storage = createStorageClient();
        const service = new FileUploadService(storage, { keyPrefix: '/public/uploads/' });

        expect(service.buildKey('tenant/file.txt')).toBe('public/uploads/tenant/file.txt');
        expect(() => service.buildKey('../private.txt')).toThrow(BadRequestException);
        expect(() => service.buildKey('%2e%2e/private.txt')).toThrow(BadRequestException);
        expect(() => service.buildKey('%252e%252e/private.txt')).toThrow(BadRequestException);
        expect(() => service.buildKey('tenant\\private.txt')).toThrow(BadRequestException);
        expect(() => new FileUploadService(storage, { keyPrefix: '../private' })).toThrow(
            'keyPrefix contains an unsafe path segment',
        );
        await expect(service.getFileUrl('/absolute.txt')).rejects.toThrow(BadRequestException);
        await expect(service.cleanupUploadedFiles([{ key: 'private/file.txt' }])).rejects.toThrow(
            'Uploaded file key is outside the configured keyPrefix',
        );
        expect(storage.getSignedUrl).not.toHaveBeenCalled();
        expect(storage.delete).not.toHaveBeenCalled();
    });

    it('uses normalized storage keys for URL, existence, and delete helpers', async () => {
        const storage = createStorageClient();
        const service = new FileUploadService(storage, { keyPrefix: '/public/uploads/' });

        await expect(service.getFileUrl('file.txt', 30)).resolves.toBe('signed-url');
        await expect(service.fileExists('file.txt')).resolves.toBe(true);
        await service.deleteFile('file.txt');

        expect(storage.getSignedUrl).toHaveBeenCalledWith('public/uploads/file.txt', 30);
        expect(storage.exists).toHaveBeenCalledWith('public/uploads/file.txt');
        expect(storage.delete).toHaveBeenCalledWith('public/uploads/file.txt');
    });

    it('extracts multipart files from common request shapes and filters fields', () => {
        const first = multipartFile('first.txt', 'avatar');
        const second = multipartFile('second.txt', 'documents');
        const third = multipartFile('third.txt', 'documents');

        expect(extractFiles({ file: first })).toEqual([first]);
        expect(extractFiles({ files: [first, second] })).toEqual([first, second]);
        expect(extractFiles({ files: { avatar: first, documents: [second, third] } })).toEqual([first, second, third]);
        expect(extractFiles({ files: [first, second] }, 'documents')).toEqual([second]);
        expect(extractFiles({})).toEqual([]);
    });

    it('applies route metadata and merges uploaded files into the response', async () => {
        const storage = createStorageClient();
        const service = new FileUploadService(storage, { storedNameFactory: input => input.originalName });
        const interceptor = new FileUploadInterceptor(service, new Reflector());
        const route = createDecoratedRoute({ fieldName: 'documents', allowedExtensions: ['txt'], maxCount: 2 });
        const request = {
            files: {
                avatar: multipartFile('avatar.png', 'avatar', 'image/png'),
                documents: [multipartFile('one.txt', 'documents'), multipartFile('two.txt', 'documents')],
            },
        };

        const result = await lastValueFrom(
            await interceptor.intercept(createHttpContext(request, route), { handle: () => of({ ok: true }) }),
        );

        expect(storage.upload).toHaveBeenCalledTimes(2);
        expect(storage.upload).not.toHaveBeenCalledWith(
            expect.stringContaining('avatar.png'),
            expect.anything(),
            expect.anything(),
        );
        expect(request).toMatchObject({
            uploadedFiles: [
                { originalName: 'one.txt', key: 'uploads/one.txt' },
                { originalName: 'two.txt', key: 'uploads/two.txt' },
            ],
        });
        expect(result).toMatchObject({
            ok: true,
            files: [
                { originalName: 'one.txt', key: 'uploads/one.txt' },
                { originalName: 'two.txt', key: 'uploads/two.txt' },
            ],
        });
    });

    it('uploads a single selected file and rejects ambiguous or missing inputs', async () => {
        const service = new FileUploadService(createStorageClient(), {
            storedNameFactory: input => input.originalName,
        });
        const interceptor = new SingleFileUploadInterceptor(service, new Reflector());
        const route = createDecoratedRoute({ fieldName: 'avatar' });
        const request = {
            files: [multipartFile('avatar.png', 'avatar', 'image/png'), multipartFile('note.txt', 'document')],
        };

        const result = await lastValueFrom(
            await interceptor.intercept(createHttpContext(request, route), { handle: () => of('ignored') }),
        );

        await expect(
            interceptor.intercept(createHttpContext({}, route), { handle: () => of('never') }),
        ).rejects.toThrow(BadRequestException);
        await expect(
            interceptor.intercept(
                createHttpContext(
                    {
                        files: [
                            multipartFile('one.png', 'avatar', 'image/png'),
                            multipartFile('two.png', 'avatar', 'image/png'),
                        ],
                    },
                    route,
                ),
                { handle: () => of('never') },
            ),
        ).rejects.toThrow('Single-file upload received more than one file');
        expect(request).toMatchObject({ uploadedFile: { originalName: 'avatar.png', key: 'uploads/avatar.png' } });
        expect(result).toMatchObject({ file: { originalName: 'avatar.png', key: 'uploads/avatar.png' } });
    });

    it('exposes uploaded request values through parameter decorators', () => {
        class Controller {
            handle(_file: unknown, _files: unknown) {}
        }
        UploadedFile()(Controller.prototype, 'handle', 0);
        UploadedFiles()(Controller.prototype, 'handle', 1);
        const uploadedFile = { key: 'uploads/one.txt' };
        const uploadedFiles = [uploadedFile];
        const context = createHttpContext({ uploadedFile, uploadedFiles });
        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Controller, 'handle') as Record<
            string,
            { index: number; factory: (data: unknown, context: unknown) => unknown }
        >;
        const entries = Object.values(metadata);

        expect(entries.find(entry => entry.index === 0)?.factory(undefined, context)).toBe(uploadedFile);
        expect(entries.find(entry => entry.index === 1)?.factory(undefined, context)).toBe(uploadedFiles);
    });

    it('removes an uploaded object when signed URL generation fails', async () => {
        const storage = createStorageClient();
        const signingError = new Error('signing unavailable');
        storage.getSignedUrl.mockRejectedValueOnce(signingError);
        const service = new FileUploadService(storage, { storedNameFactory: input => input.originalName });

        await expect(service.uploadFile(Buffer.from('file'), 'one.txt', 'text/plain')).rejects.toBe(signingError);

        expect(storage.delete).toHaveBeenCalledWith('uploads/one.txt');
    });

    it('preserves the original cause when compensating cleanup fails', async () => {
        const storage = createStorageClient();
        const signingError = new Error('signing unavailable');
        const cleanupError = new Error('delete unavailable');
        storage.getSignedUrl.mockRejectedValueOnce(signingError);
        storage.delete.mockRejectedValueOnce(cleanupError);
        const service = new FileUploadService(storage, { storedNameFactory: input => input.originalName });

        const error = await service.uploadFile(Buffer.from('file'), 'one.txt', 'text/plain').catch(value => value);

        expect(error).toBeInstanceOf(FileCleanupError);
        expect(error).toMatchObject({
            cause: signingError,
            failures: [{ key: 'uploads/one.txt', error: cleanupError }],
        });
    });

    it('reports cleanup failures alongside the batch operation error', async () => {
        const storage = createStorageClient();
        const operationError = new Error('second upload failed');
        const cleanupError = new Error('first delete failed');
        storage.upload.mockImplementation(async key => {
            if (key.endsWith('two.txt')) throw operationError;
        });
        storage.delete.mockRejectedValueOnce(cleanupError);
        const service = new FileUploadService(storage, {
            storedNameFactory: input => input.originalName,
            maxConcurrentUploads: 1,
        });

        const error = await service.uploadFiles([uploadInput('one.txt'), uploadInput('two.txt')]).catch(value => value);

        expect(error).toBeInstanceOf(FileBatchUploadError);
        expect(error).toMatchObject({
            cause: operationError,
            operationErrors: [operationError],
            cleanupFailures: [{ key: 'uploads/one.txt', error: cleanupError }],
        });
    });

    it('prevalidates batches and compensates successful writes after a remote failure', async () => {
        const storage = createStorageClient();
        const service = new FileUploadService(storage, {
            storedNameFactory: input => input.originalName,
            maxConcurrentUploads: 1,
        });

        await expect(
            service.uploadFiles([uploadInput('valid.txt'), uploadInput('invalid.exe', 'application/x-msdownload')]),
        ).rejects.toThrow(BadRequestException);
        expect(storage.upload).not.toHaveBeenCalled();

        const duplicateService = new FileUploadService(storage, {
            storedNameFactory: () => 'duplicate.txt',
        });
        await expect(duplicateService.uploadFiles([uploadInput('one.txt'), uploadInput('two.txt')])).rejects.toThrow(
            "Batch upload generated duplicate object key 'uploads/duplicate.txt'",
        );
        expect(storage.upload).not.toHaveBeenCalled();

        const remoteError = new Error('storage unavailable');
        storage.upload.mockImplementation(async key => {
            if (key.endsWith('two.txt')) throw remoteError;
        });
        const error = await service
            .uploadFiles([uploadInput('one.txt'), uploadInput('two.txt'), uploadInput('three.txt')])
            .catch(value => value);

        expect(error).toBeInstanceOf(FileBatchUploadError);
        expect(error).toMatchObject({ operationErrors: [remoteError], cleanupFailures: [] });
        expect(storage.delete).toHaveBeenCalledWith('uploads/one.txt');
        expect(storage.upload).not.toHaveBeenCalledWith('uploads/three.txt', expect.anything(), expect.anything());
    });

    it('bounds batch upload concurrency', async () => {
        const storage = createStorageClient();
        let active = 0;
        let peak = 0;
        storage.upload.mockImplementation(async () => {
            active += 1;
            peak = Math.max(peak, active);
            await new Promise(resolve => setTimeout(resolve, 5));
            active -= 1;
        });
        const service = new FileUploadService(storage, {
            storedNameFactory: input => input.originalName,
            maxConcurrentUploads: 2,
            maxFiles: 5,
        });

        await service.uploadFiles([
            uploadInput('one.txt'),
            uploadInput('two.txt'),
            uploadInput('three.txt'),
            uploadInput('four.txt'),
            uploadInput('five.txt'),
        ]);

        expect(peak).toBe(2);
    });

    it('rolls back uploads when downstream handlers fail', async () => {
        const storage = createStorageClient();
        const service = new FileUploadService(storage, { storedNameFactory: input => input.originalName });
        const interceptor = new SingleFileUploadInterceptor(service, new Reflector());
        const handlerError = new Error('database transaction failed');

        const observable = await interceptor.intercept(createHttpContext({ file: multipartFile('one.txt') }), {
            handle: () => throwError(() => handlerError),
        });
        await expect(lastValueFrom(observable)).rejects.toBe(handlerError);
        expect(storage.delete).toHaveBeenCalledWith('uploads/one.txt');

        storage.delete.mockClear();
        await expect(
            interceptor.intercept(createHttpContext({ file: multipartFile('two.txt') }), {
                handle: () => {
                    throw handlerError;
                },
            }),
        ).rejects.toBe(handlerError);
        expect(storage.delete).toHaveBeenCalledWith('uploads/two.txt');
    });

    it('can retain successful uploads after a handler failure when explicitly configured', async () => {
        const storage = createStorageClient();
        const service = new FileUploadService(storage, {
            storedNameFactory: input => input.originalName,
            rollbackOnHandlerError: false,
        });
        const interceptor = new SingleFileUploadInterceptor(service, new Reflector());
        const handlerError = new Error('handler failed after persisting the key');

        const observable = await interceptor.intercept(createHttpContext({ file: multipartFile('one.txt') }), {
            handle: () => throwError(() => handlerError),
        });

        await expect(lastValueFrom(observable)).rejects.toBe(handlerError);
        expect(storage.delete).not.toHaveBeenCalled();
    });

    it('surfaces downstream cleanup failures without losing the handler cause', async () => {
        const storage = createStorageClient();
        const cleanupError = new Error('delete unavailable');
        storage.delete.mockRejectedValueOnce(cleanupError);
        const service = new FileUploadService(storage, { storedNameFactory: input => input.originalName });
        const interceptor = new SingleFileUploadInterceptor(service, new Reflector());
        const handlerError = new Error('handler failed');
        const observable = await interceptor.intercept(createHttpContext({ file: multipartFile('one.txt') }), {
            handle: () => throwError(() => handlerError),
        });

        const error = await lastValueFrom(observable).catch(value => value);

        expect(error).toBeInstanceOf(FileCleanupError);
        expect(error).toMatchObject({
            cause: handlerError,
            failures: [{ key: 'uploads/one.txt', error: cleanupError }],
        });
    });

    it('fails fast for invalid service configuration and missing storage', async () => {
        expect(() => new FileUploadService(undefined, { maxFiles: 0 })).toThrow('maxFiles must be a positive integer');
        const service = new FileUploadService();

        await expect(service.uploadFile(Buffer.from('file'), 'one.txt', 'text/plain')).rejects.toThrow(
            'File storage client is not configured',
        );
        await expect(service.getFileUrl('one.txt', 0)).rejects.toThrow('expiresInSeconds must be a positive integer');
    });

    it('registers static and asynchronous module providers', async () => {
        const storage = createStorageClient();
        const module = FileUploadModule.register({ keyPrefix: 'files', storageClient: storage });
        const useFactory = jest.fn(async () => ({ keyPrefix: 'async-files', storageClient: storage }));
        const asyncModule = FileUploadModule.registerAsync({
            imports: [class ConfigModule {}],
            inject: ['CONFIG'],
            useFactory,
        });

        expect(module.providers).toEqual(
            expect.arrayContaining([
                FileUploadService,
                FileUploadInterceptor,
                SingleFileUploadInterceptor,
                expect.objectContaining({ provide: FILE_UPLOAD_OPTIONS }),
                expect.objectContaining({ provide: FILE_STORAGE_CLIENT, useValue: storage }),
            ]),
        );
        expect(module.exports).toEqual(
            expect.arrayContaining([FileUploadService, FileUploadInterceptor, SingleFileUploadInterceptor]),
        );
        expect(asyncModule.providers).toEqual(
            expect.arrayContaining([
                FileUploadService,
                FileUploadInterceptor,
                SingleFileUploadInterceptor,
                expect.objectContaining({ provide: FILE_UPLOAD_OPTIONS, inject: ['CONFIG'], useFactory }),
                expect.objectContaining({ provide: FILE_STORAGE_CLIENT, inject: [FILE_UPLOAD_OPTIONS] }),
            ]),
        );

        const storageProvider = asyncModule.providers?.find(
            provider =>
                typeof provider === 'object' &&
                provider !== null &&
                'provide' in provider &&
                provider.provide === FILE_STORAGE_CLIENT,
        ) as { useFactory: (options: { storageClient: FileStorageClient }) => FileStorageClient };
        expect(storageProvider.useFactory(await useFactory())).toBe(storage);
    });

    it('resolves asynchronous options and storage through the Nest container', async () => {
        const storage = createStorageClient();
        @Module({
            providers: [{ provide: 'FILE_PREFIX', useValue: 'async-files' }],
            exports: ['FILE_PREFIX'],
        })
        class ConfigModule {}

        const application = await NestFactory.createApplicationContext(
            FileUploadModule.registerAsync({
                imports: [ConfigModule],
                inject: ['FILE_PREFIX'],
                useFactory: (keyPrefix: string) => ({
                    keyPrefix,
                    storageClient: storage,
                    storedNameFactory: input => input.originalName,
                }),
            }),
            { logger: false },
        );

        const service = application.get(FileUploadService);
        await service.uploadFile(Buffer.from('file'), 'one.txt', 'text/plain');
        await application.close();

        expect(storage.upload).toHaveBeenCalledWith('async-files/one.txt', Buffer.from('file'), {
            contentType: 'text/plain',
        });
    });
});

function createStorageClient(): jest.Mocked<FileStorageClient> {
    return {
        upload: jest.fn().mockResolvedValue(undefined),
        getSignedUrl: jest.fn().mockResolvedValue('signed-url'),
        delete: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue(true),
    };
}

function uploadInput(filename: string, mimeType = 'text/plain') {
    return { buffer: Buffer.from('file'), filename, mimeType };
}

function multipartFile(originalname: string, fieldname = 'file', mimetype = 'text/plain') {
    return {
        fieldname,
        originalname,
        encoding: '7bit',
        mimetype,
        size: 4,
        buffer: Buffer.from('file'),
    };
}

function createDecoratedRoute(options: FileUploadMetadata) {
    class Controller {
        handler() {}
    }
    const descriptor = Object.getOwnPropertyDescriptor(Controller.prototype, 'handler');
    FileUpload(options)(Controller.prototype, 'handler', descriptor!);
    return { controller: Controller, handler: Controller.prototype.handler };
}

function createHttpContext(
    request: Record<string, unknown>,
    route: { controller: new (...args: never[]) => unknown; handler: (...args: never[]) => unknown } = {
        controller: class Controller {},
        handler: () => undefined,
    },
) {
    return {
        switchToHttp: () => ({
            getRequest: () => request,
        }),
        getHandler: () => route.handler,
        getClass: () => route.controller,
    } as never;
}
