// ============================================================================
// Audit Service - Operation logging for compliance
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { KyselyService } from '@a3s-lab/kysely';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLogEntry {
    id?: string;
    timestamp?: Date;
    userId: string;
    organizationId: string;
    action: string;
    resource: string;
    resourceId?: string;
    changes?: Record<string, { before: unknown; after: unknown }>;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    status: 'success' | 'failure' | 'error';
    errorMessage?: string;
}

export interface AuditQueryOptions {
    userId?: string;
    organizationId: string;
    resource?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
}

export interface PaginatedAuditResult {
    items: AuditLogEntry[];
    total: number;
    page: number;
    pageSize: number;
}

/**
 * Audit Service - logs all operations for compliance
 */
@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);
    private readonly tableName = 'audit_logs';

    constructor(private readonly kysely: KyselyService<any>) {}

    /**
     * Log an audit entry
     */
    async log(entry: AuditLogEntry): Promise<void> {
        const auditEntry: Record<string, unknown> = {
            id: entry.id ?? uuidv4(),
            timestamp: entry.timestamp ?? new Date(),
            user_id: entry.userId,
            organization_id: entry.organizationId,
            action: entry.action,
            resource: entry.resource,
            resource_id: entry.resourceId,
            changes: entry.changes ? JSON.stringify(entry.changes) : null,
            metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
            ip_address: entry.ipAddress,
            user_agent: entry.userAgent,
            status: entry.status,
            error_message: entry.errorMessage,
        };

        try {
            await this.kysely.insertInto(this.tableName).values(auditEntry).executeTakeFirst();
            this.logger.debug(`Audit log created: ${entry.action} on ${entry.resource}`);
        } catch (error) {
            // Don't fail the operation if audit logging fails
            this.logger.error(`Failed to write audit log: ${error}`);
        }
    }

    /**
     * Log entity creation
     */
    async logCreate(
        userId: string,
        organizationId: string,
        resource: string,
        resourceId: string,
        data: Record<string, unknown>,
        metadata?: Record<string, unknown>,
    ): Promise<void> {
        await this.log({
            userId,
            organizationId,
            action: 'create',
            resource,
            resourceId,
            changes: Object.fromEntries(
                Object.entries(data).map(([key, value]) => [key, { before: null, after: value }]),
            ),
            metadata,
            status: 'success',
        });
    }

    /**
     * Log entity update
     */
    async logUpdate(
        userId: string,
        organizationId: string,
        resource: string,
        resourceId: string,
        before: Record<string, unknown>,
        after: Record<string, unknown>,
        metadata?: Record<string, unknown>,
    ): Promise<void> {
        const changes: Record<string, { before: unknown; after: unknown }> = {};

        for (const key of Object.keys(after)) {
            if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
                changes[key] = { before: before[key], after: after[key] };
            }
        }

        if (Object.keys(changes).length > 0) {
            await this.log({
                userId,
                organizationId,
                action: 'update',
                resource,
                resourceId,
                changes,
                metadata,
                status: 'success',
            });
        }
    }

    /**
     * Log entity deletion
     */
    async logDelete(
        userId: string,
        organizationId: string,
        resource: string,
        resourceId: string,
        data: Record<string, unknown>,
        metadata?: Record<string, unknown>,
    ): Promise<void> {
        await this.log({
            userId,
            organizationId,
            action: 'delete',
            resource,
            resourceId,
            changes: Object.fromEntries(
                Object.entries(data).map(([key, value]) => [key, { before: value, after: null }]),
            ),
            metadata,
            status: 'success',
        });
    }

    /**
     * Log failed operation
     */
    async logFailure(
        userId: string,
        organizationId: string,
        action: string,
        resource: string,
        errorMessage: string,
        metadata?: Record<string, unknown>,
    ): Promise<void> {
        await this.log({
            userId,
            organizationId,
            action,
            resource,
            metadata,
            status: 'failure',
            errorMessage,
        });
    }

    /**
     * Query audit logs
     */
    async query(options: AuditQueryOptions): Promise<PaginatedAuditResult> {
        const page = options.page ?? 1;
        const pageSize = options.pageSize ?? 20;
        const offset = (page - 1) * pageSize;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (this.kysely as any)
            .selectFrom(this.tableName)
            .where('organization_id', '=', options.organizationId);

        if (options.userId) {
            query = query.where('user_id', '=', options.userId);
        }

        if (options.resource) {
            query = query.where('resource', '=', options.resource);
        }

        if (options.action) {
            query = query.where('action', '=', options.action);
        }

        if (options.startDate) {
            query = query.where('timestamp', '>=', options.startDate);
        }

        if (options.endDate) {
            query = query.where('timestamp', '<=', options.endDate);
        }

        const countResult = await query.select((eb: any) => eb.fn.countAll().as('count')).executeTakeFirst();

        const total = Number((countResult as { count?: number })?.count ?? 0);

        const items = await query.orderBy('timestamp', 'desc').limit(pageSize).offset(offset).execute();

        return {
            items: items as AuditLogEntry[],
            total,
            page,
            pageSize,
        };
    }

    /**
     * Get audit log by ID
     */
    async getById(id: string, organizationId: string): Promise<AuditLogEntry | null> {
        const row = await this.kysely
            .selectFrom(this.tableName)
            .where('id', '=', id)
            .where('organization_id', '=', organizationId)
            .executeTakeFirst();

        return (row as AuditLogEntry) || null;
    }
}
