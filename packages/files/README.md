# @a3s-lab/files

Storage-neutral file validation and failure-safe NestJS upload workflows.

## Install

```bash
pnpm add @a3s-lab/files @nestjs/common @nestjs/core express rxjs
```

## Use

### Module configuration

Provide an adapter that implements `FileStorageClient`, then register the module:

```ts
import { Module } from '@nestjs/common';
import { FileUploadModule, type FileStorageClient } from '@a3s-lab/files';

const storage: FileStorageClient = {
    upload: (key, body, options) => objectStore.put(key, body, options),
    getSignedUrl: (key, expiresIn) => objectStore.signGet(key, expiresIn),
    delete: key => objectStore.delete(key),
    exists: key => objectStore.exists(key),
};

@Module({
    imports: [
        FileUploadModule.register({
            storageClient: storage,
            keyPrefix: 'uploads',
            signedUrlExpiresInSeconds: 900,
            maxFiles: 10,
            maxConcurrentUploads: 4,
            validation: {
                maxSize: 10 * 1024 * 1024,
                allowedTypes: ['image/png', 'image/jpeg', 'application/pdf'],
            },
        }),
    ],
})
export class AppModule {}
```

`registerAsync` supports clients and policies created from injected configuration:

```ts
FileUploadModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: async (config: ConfigService) => ({
        storageClient: await createStorageClient(config),
        keyPrefix: config.getOrThrow('FILE_PREFIX'),
    }),
});
```

## Route policies and uploaded parameters

The interceptors consume `@FileUpload()` metadata. `@UploadedFile()` and `@UploadedFiles()` read the stored results from the request as real Nest parameter decorators:

```ts
import { Controller, Post, UseInterceptors } from '@nestjs/common';
import {
    FileUpload,
    SingleFileUploadInterceptor,
    UploadedFile,
    type StoredUploadedFile,
} from '@a3s-lab/files';

@Controller('documents')
export class DocumentsController {
    @Post()
    @FileUpload({
        fieldName: 'document',
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['application/pdf'],
        allowedExtensions: ['pdf'],
    })
    @UseInterceptors(SingleFileUploadInterceptor)
    create(@UploadedFile() file: StoredUploadedFile) {
        return { key: file.key };
    }
}
```

Use `FileUploadInterceptor` with `@UploadedFiles()` for multiple files. The multipart adapter must populate `request.file` or `request.files` before these interceptors run.

## Failure and concurrency semantics

The safe defaults are:

| Option | Default | Behavior |
| --- | ---: | --- |
| `maxFiles` | `10` | Reject larger batches before any remote write. |
| `maxConcurrentUploads` | `4` | Bound storage pressure while preserving input order. |
| `rollbackOnFailure` | `true` | Delete completed objects when signing or another batch operation fails. |
| `rollbackOnHandlerError` | `true` | Delete uploaded objects if the downstream route handler fails. |

Every file in a batch is validated and assigned a unique key before the first storage call. After the first remote failure, no new work is scheduled; already completed uploads are compensated with deletes. `FileBatchUploadError` exposes operation errors and cleanup failures, while `FileCleanupError` retains the original error as `cause` if compensation itself fails.

Set `rollbackOnHandlerError: false` only when a handler deliberately persists the file reference before emitting an error. Compensation is best-effort rather than a distributed transaction, so custom `storedNameFactory` implementations should generate keys that do not overwrite existing objects.

## Object-key safety

`keyPrefix`, generated names, URL lookup names, and delete names are validated as relative logical object paths. Empty segments, dot traversal, encoded traversal, absolute paths, backslashes, and control characters are rejected. Cleanup helpers also refuse keys outside the configured prefix.

The default policy validates the declared MIME type and a 10 MiB size limit. MIME declarations are not content sniffing; applications handling untrusted formats should add magic-byte or malware inspection before upload.

## Notes

This package does not parse multipart bodies or choose an object store, bucket, credentials, retention policy, or malware scanner. The consuming application owns those integrations. Compensating deletes improve failure consistency but cannot provide a distributed transaction across the handler's database and object storage.

## Exports

- `FileUploadModule`, including `register` and `registerAsync`
- `FileUploadService` and the `FileStorageClient` contract
- `FileUploadInterceptor` and `SingleFileUploadInterceptor`
- `FileUpload`, `UploadedFile`, and `UploadedFiles`
- Validation, upload result, cleanup, batch error, and module option types

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
