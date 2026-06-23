# @a3s-lab/files

Generic file upload validation, storage contracts, and NestJS interceptors for backend APIs.

## Install

```bash
pnpm add @a3s-lab/files
pnpm add @nestjs/common @nestjs/core express rxjs
```

## Use

```ts
import { FILE_STORAGE_CLIENT, FileUploadModule, FileUploadService } from '@a3s-lab/files';

FileUploadModule.register({
    keyPrefix: 'uploads',
    signedUrlExpiresInSeconds: 900,
});

class FileHandler {
    constructor(private readonly files: FileUploadService) {}

    async save(buffer: Buffer) {
        return this.files.uploadFile(buffer, 'document.pdf', 'application/pdf');
    }
}
```

Provide `FILE_STORAGE_CLIENT` with an adapter that implements `upload`, `getSignedUrl`, `delete`, and `exists`.

## Exports

- File storage client contract and injection token
- File validation options and default validation policy
- Upload service with key generation and signed URL helpers
- Multipart file extraction helpers
- Single and multi-file upload interceptors
- Upload decorators and metadata keys
- `FileUploadModule`

## Notes

This package does not choose object storage, bucket names, credentials, or route-level upload policy. Those decisions belong in the consuming API.

See the [framework core guide](../../docs/framework-core.md) for package boundaries.
