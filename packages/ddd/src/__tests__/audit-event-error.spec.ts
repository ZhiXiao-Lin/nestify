import { AuditableEntity, DomainEvent, DomainValidationError, SoftDeletableEntity } from '../index';

class AuditRecord extends AuditableEntity<string> {}
class DeletedRecord extends SoftDeletableEntity<string> {}

class RecordedEvent extends DomainEvent {
    constructor(
        private readonly aggregateId: string,
        occurredOn?: Date,
    ) {
        super(occurredOn);
    }

    getAggregateId(): string {
        return this.aggregateId;
    }
}

describe('audit time invariants', () => {
    it('copies input dates and protects internal dates from callers', () => {
        const createdAt = new Date('2026-01-01T00:00:00.000Z');
        const updatedAt = new Date('2026-01-02T00:00:00.000Z');
        const record = new AuditRecord('record-1', createdAt, updatedAt, 'creator', 'editor');

        createdAt.setUTCFullYear(2030);
        updatedAt.setUTCFullYear(2030);
        const exposedCreatedAt = record.createdAt;
        exposedCreatedAt.setUTCFullYear(2040);

        expect(record.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
        expect(record.updatedAt.toISOString()).toBe('2026-01-02T00:00:00.000Z');
        expect(record.createdAt).not.toBe(record.createdAt);
        expect(record.createdBy).toBe('creator');
        expect(record.updatedBy).toBe('editor');
        expect(Object.keys(record)).toEqual(expect.arrayContaining(['createdAt', 'updatedAt']));
    });

    it('compares audit dates and actor identifiers', () => {
        const record = new AuditRecord(
            'record-1',
            new Date('2026-01-02T00:00:00.000Z'),
            new Date('2026-01-03T00:00:00.000Z'),
            'creator',
            'editor',
        );

        expect(record.isCreatedAfter(new Date('2026-01-01T00:00:00.000Z'))).toBe(true);
        expect(record.isCreatedAfter(new Date('2026-01-02T00:00:00.000Z'))).toBe(false);
        expect(record.isUpdatedAfter(new Date('2026-01-02T12:00:00.000Z'))).toBe(true);
        expect(record.isUpdatedBy('editor')).toBe(true);
        expect(record.isUpdatedBy('other')).toBe(false);
    });

    it('rejects invalid and reversed audit dates', () => {
        expect(
            () =>
                new AuditRecord('record-1', new Date('2026-01-02T00:00:00.000Z'), new Date('2026-01-01T00:00:00.000Z')),
        ).toThrow('updatedAt must not be before createdAt');
        expect(() => new AuditRecord('record-1', new Date('invalid'), new Date())).toThrow(DomainValidationError);
        const record = new AuditRecord('record-1', new Date('2026-01-01'), new Date('2026-01-02'));
        expect(() => record.isUpdatedAfter(new Date('invalid'))).toThrow(DomainValidationError);
    });
});

describe('soft deletion invariants', () => {
    it('represents active records without synthetic deletion ages', () => {
        const record = new DeletedRecord(
            'record-1',
            new Date('2026-01-01T00:00:00.000Z'),
            new Date('2026-01-02T00:00:00.000Z'),
        );

        expect(record.isDeleted()).toBe(false);
        expect(record.isDeletedBy('actor')).toBe(false);
        expect(record.daysSinceDeletion(new Date('2026-01-10T00:00:00.000Z'))).toBeNull();
    });

    it('calculates deterministic whole days from defensive dates', () => {
        const deletedAt = new Date('2026-01-03T12:00:00.000Z');
        const record = new DeletedRecord(
            'record-1',
            new Date('2026-01-01T00:00:00.000Z'),
            new Date('2026-01-02T00:00:00.000Z'),
            deletedAt,
            'actor',
        );
        deletedAt.setUTCFullYear(2030);
        const exposed = record.deletedAt as Date;
        exposed.setUTCFullYear(2040);

        expect(record.isDeleted()).toBe(true);
        expect(record.isDeletedBy('actor')).toBe(true);
        expect(record.daysSinceDeletion(new Date('2026-01-05T11:59:59.999Z'))).toBe(1);
        expect(record.deletedAt?.toISOString()).toBe('2026-01-03T12:00:00.000Z');
    });

    it('rejects inconsistent deletion metadata and negative elapsed time', () => {
        expect(
            () =>
                new DeletedRecord(
                    'record-1',
                    new Date('2026-01-01T00:00:00.000Z'),
                    new Date('2026-01-03T00:00:00.000Z'),
                    new Date('2026-01-02T00:00:00.000Z'),
                ),
        ).toThrow('deletedAt must not be before updatedAt');
        expect(
            () =>
                new DeletedRecord(
                    'record-1',
                    new Date('2026-01-01T00:00:00.000Z'),
                    new Date('2026-01-02T00:00:00.000Z'),
                    undefined,
                    'actor',
                ),
        ).toThrow('deletedBy requires deletedAt');

        const record = new DeletedRecord(
            'record-1',
            new Date('2026-01-01T00:00:00.000Z'),
            new Date('2026-01-02T00:00:00.000Z'),
            new Date('2026-01-03T00:00:00.000Z'),
        );
        expect(() => record.daysSinceDeletion(new Date('2026-01-02T00:00:00.000Z'))).toThrow(
            'asOf must not be before deletedAt',
        );
    });
});

describe('domain event and validation error values', () => {
    it('uses a deterministic, defensive event timestamp', () => {
        const occurredOn = new Date('2026-02-01T00:00:00.000Z');
        const event = new RecordedEvent('record-1', occurredOn);
        occurredOn.setUTCFullYear(2030);
        const exposed = event.occurredOn;
        exposed.setUTCFullYear(2040);

        expect(event.occurredOn.toISOString()).toBe('2026-02-01T00:00:00.000Z');
        expect(event.getAggregateId()).toBe('record-1');
        expect(Object.keys(event)).toContain('occurredOn');
    });

    it('rejects invalid event timestamps', () => {
        expect(() => new RecordedEvent('record-1', new Date('invalid'))).toThrow(DomainValidationError);
    });

    it('normalizes messages and snapshots top-level error details', () => {
        const details = { field: 'amount' };
        const error = new DomainValidationError('  Invalid amount  ', details);
        details.field = 'changed';

        expect(error.name).toBe('DomainValidationError');
        expect(error.message).toBe('Invalid amount');
        expect(error.details).toEqual({ field: 'amount' });
        expect(Object.isFrozen(error.details)).toBe(true);
        expect(new DomainValidationError('   ').message).toBe('Domain validation failed');
        expect(new DomainValidationError('x'.repeat(5_000)).message).toHaveLength(4_096);
        expect(new DomainValidationError(null as never).message).toBe('Domain validation failed');

        const unreadable = {};
        Object.defineProperty(unreadable, 'secret', {
            enumerable: true,
            get: () => {
                throw new Error('cannot read');
            },
        });
        expect(new DomainValidationError('failure', unreadable).details).toEqual({
            secret: '[Unreadable detail]',
        });
        const unenumerable = new Proxy(
            {},
            {
                ownKeys: () => {
                    throw new Error('cannot enumerate');
                },
            },
        );
        expect(new DomainValidationError('failure', unenumerable).details).toEqual({
            details: '[Unserializable details]',
        });
    });
});
