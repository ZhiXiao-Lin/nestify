# @a3s-lab/rustfs

NestJS module and service helpers for S3-compatible object storage.

## Install

```bash
pnpm add @a3s-lab/rustfs @nestjs/common
```

## Use

```ts
import { RustFSModule } from '@a3s-lab/rustfs';

@Module({
    imports: [
        RustFSModule.register({
            endpoint: 'http://localhost:9000',
            accessKeyId: 'access-key',
            secretAccessKey: 'secret-key',
            bucket: 'objects',
            forcePathStyle: true,
            connectionTimeout: 3_000,
            requestTimeout: 30_000,
            maxAttempts: 3,
        }),
    ],
})
export class AppModule {}
```

Inject the service to manage buckets, objects, presigned URLs, and multipart uploads:

```ts
import { Injectable } from '@nestjs/common';
import { RustFSService } from '@a3s-lab/rustfs';

@Injectable()
export class ObjectStorage {
    constructor(private readonly storage: RustFSService) {}

    async putObject(key: string, body: Buffer) {
        return this.storage.putObject('objects', {
            key,
            body,
            contentType: 'application/octet-stream',
            metadata: { source: 'api' },
        });
    }

    async readObject(key: string) {
        return this.storage.getObject('objects', { key });
    }

    async createReadUrl(key: string) {
        return this.storage.getPresignedUrl('objects', {
            key,
            expiresIn: 900,
        });
    }

    async createUploadUrl(key: string, contentType: string) {
        return this.storage.getPresignedUrl('objects', {
            key,
            method: 'PUT',
            contentType,
            expiresIn: 900,
        });
    }

    async createBrowserUploadForm(key: string, contentType: string) {
        return this.storage.getPresignedPostUrl('objects', {
            key,
            expiresIn: 900,
            conditions: {
                contentType,
                contentLengthRange: { min: 1, max: 10 * 1024 * 1024 },
                acl: 'private',
            },
        });
    }
}
```

`getPresignedUrl` creates command-specific signatures for `GET`, `PUT`, and `DELETE`. For a browser multipart/form-data upload, use `getPresignedPostUrl`; it returns the URL and every form field that the client must submit. Signed URLs expire after one hour by default and accept values from 1 second through 7 days.

For GET response overrides, `queryParams` supports `versionId`, `response-cache-control`, `response-content-disposition`, `response-content-encoding`, `response-content-language`, `response-content-type`, and `response-expires`. Unsupported parameters fail before signing so callers cannot accidentally receive a URL that omits requested constraints.

## Connection lifecycle

The endpoint must be an absolute `http://` or `https://` URL. Its protocol controls TLS; the legacy `sslEnabled` option is deprecated and, when supplied, must agree with the URL. The legacy `timeout` option still sets both connection and request timeouts, while new code should configure them separately.

The module owns its S3-compatible client. During Nest shutdown it stops accepting new operations, waits for active requests to settle, and then destroys the client and its sockets.

## Exports

- `RustFSModule`
- `RustFSService`
- Bucket, object, presigned URL, multipart upload, health, and module option types
- Configurable module definition helpers

## Notes

The package owns generic S3-compatible client creation, bucket operations, object operations, presigned URLs and POST policies, multipart upload helpers, error mapping, and health checks. Applications still own bucket names, object key conventions, metadata contracts, retention policy, and access policy.
