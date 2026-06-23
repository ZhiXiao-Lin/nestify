import { SetMetadata, applyDecorators } from '@nestjs/common';

export const SENSITIVE_OPERATION_KEY = 'sensitive_operation';

export interface SensitiveOperationOptions {
    operation: string;
    requireReauth?: boolean;
    description?: string;
}

export function MarkSensitive(
    operation: string,
    options: { requireReauth?: boolean; description?: string } = {},
): MethodDecorator {
    return applyDecorators(
        SetMetadata(SENSITIVE_OPERATION_KEY, {
            operation,
            requireReauth: options.requireReauth ?? true,
            description: options.description,
        } satisfies SensitiveOperationOptions),
    );
}

export const AuditedDelete = () =>
    MarkSensitive('resource:delete', { requireReauth: true, description: 'Delete resource' });
export const AuditedCreate = () =>
    MarkSensitive('resource:create', { requireReauth: false, description: 'Create resource' });
export const AuditedUpdate = () =>
    MarkSensitive('resource:update', { requireReauth: false, description: 'Update resource' });
