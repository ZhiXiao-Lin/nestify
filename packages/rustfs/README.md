# @a3s-lab/rustfs

NestJS module and service helpers for S3-compatible object storage.

## Install

```bash
pnpm add @a3s-lab/rustfs @nestjs/common @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
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
}
```

The package owns generic S3-compatible client creation, bucket operations, object operations, presigned URLs, multipart upload helpers, error mapping, and health checks. Applications still own bucket names, object key conventions, metadata contracts, retention policy, and access policy.
