import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import {
    FILE_STORAGE_CLIENT,
    FILE_UPLOAD_OPTIONS,
    FileUploadInterceptor,
    FileUploadModule,
    FileUploadService,
    SingleFileUploadInterceptor,
    extractFiles,
} from '../index';

describe('file upload package', () => {
    it('uploads files through the configured storage client', async () => {
        const storage = createStorageClient();
        const service = new FileUploadService(storage, {
            keyPrefix: 'incoming',
            signedUrlExpiresInSeconds: 60,
            storedNameFactory: input => `${input.size}-${input.originalName}`,
        });

        const result = await service.uploadFile(Buffer.from('hello'), 'note.txt', 'text/plain', {
            allowedExtensions: ['.txt'],
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

    it('validates size, type, and extension before upload', async () => {
        const storage = createStorageClient();
        const service = new FileUploadService(storage);

        await expect(service.uploadFile(Buffer.alloc(5), 'note.txt', 'text/plain', { maxSize: 4 })).rejects.toThrow(
            BadRequestException,
        );
        await expect(
            service.uploadFile(Buffer.alloc(1), 'note.txt', 'text/plain', { allowedTypes: ['application/pdf'] }),
        ).rejects.toThrow(BadRequestException);
        await expect(
            service.uploadFile(Buffer.alloc(1), 'note.exe', 'text/plain', { allowedExtensions: ['.txt'] }),
        ).rejects.toThrow(BadRequestException);
        expect(storage.upload).not.toHaveBeenCalled();
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

    it('extracts multipart files from common request shapes', () => {
        const first = multipartFile('first.txt');
        const second = multipartFile('second.txt');
        const third = multipartFile('third.txt');

        expect(extractFiles({ file: first })).toEqual([first]);
        expect(extractFiles({ files: [first, second] })).toEqual([first, second]);
        expect(extractFiles({ files: { avatar: first, documents: [second, third] } })).toEqual([first, second, third]);
        expect(extractFiles({})).toEqual([]);
    });

    it('uploads multiple files and merges them into the response', async () => {
        const service = new FileUploadService(createStorageClient(), {
            storedNameFactory: input => input.originalName,
        });
        const interceptor = new FileUploadInterceptor(service);
        const request = { files: [multipartFile('one.txt'), multipartFile('two.txt')] };

        const result = await lastValueFrom(
            await interceptor.intercept(createHttpContext(request), { handle: () => of({ ok: true }) }),
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

    it('uploads a single file and rejects missing files', async () => {
        const service = new FileUploadService(createStorageClient(), {
            storedNameFactory: input => input.originalName,
        });
        const interceptor = new SingleFileUploadInterceptor(service);
        const request = { file: multipartFile('one.txt') };

        const result = await lastValueFrom(
            await interceptor.intercept(createHttpContext(request), { handle: () => of('ignored') }),
        );

        await expect(
            new SingleFileUploadInterceptor(service).intercept(createHttpContext({}), { handle: () => of('never') }),
        ).rejects.toThrow(BadRequestException);
        expect(request).toMatchObject({ uploadedFile: { originalName: 'one.txt', key: 'uploads/one.txt' } });
        expect(result).toMatchObject({ file: { originalName: 'one.txt', key: 'uploads/one.txt' } });
    });

    it('registers module providers with optional storage client', () => {
        const storage = createStorageClient();
        const module = FileUploadModule.register({ keyPrefix: 'files', storageClient: storage });

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
    });
});

function createStorageClient() {
    return {
        upload: jest.fn().mockResolvedValue(undefined),
        getSignedUrl: jest.fn().mockResolvedValue('signed-url'),
        delete: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue(true),
    };
}

function multipartFile(originalname: string) {
    return {
        fieldname: 'file',
        originalname,
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 4,
        buffer: Buffer.from('file'),
    };
}

function createHttpContext(request: Record<string, unknown>) {
    return {
        switchToHttp: () => ({
            getRequest: () => request,
        }),
    } as never;
}
