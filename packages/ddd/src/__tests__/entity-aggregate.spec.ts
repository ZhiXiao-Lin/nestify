import {
    AggregateRoot,
    DOMAIN_EVENT_PUBLISHER,
    DomainEvent,
    DomainValidationError,
    Entity,
    UNIT_OF_WORK,
} from '../index';

class Account extends Entity<string> {}
class OtherAccount extends Entity<string> {}
class NumericEntity extends Entity<number> {}

class AccountEvent extends DomainEvent {
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

class AccountAggregate extends AggregateRoot<string> {}

describe('Entity identity invariants', () => {
    it('compares only the same entity type and identity', () => {
        const entity = new Account('account-1');

        expect(entity.equals(entity)).toBe(true);
        expect(entity.equals(new Account('account-1'))).toBe(true);
        expect(entity.equals(new Account('account-2'))).toBe(false);
        expect(entity.equals(new OtherAccount('account-1'))).toBe(false);
        expect(entity.equals(null as never)).toBe(false);
        expect(entity.equals({ id: 'account-1' } as never)).toBe(false);
        expect(entity.equalsById('account-1')).toBe(true);
        expect(entity.toObject()).toEqual({ id: 'account-1' });
        expect(entity.toString()).toBe('Account:account-1');
    });

    it('uses Object.is semantics for numeric identities', () => {
        expect(new NumericEntity(-0).equalsById(0)).toBe(false);
        expect(new NumericEntity(1).equals(new NumericEntity(1))).toBe(true);
    });

    it.each([null, undefined, '', '   ', Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid identity %p', id => {
        expect(() => new (Entity as never)(id)).toThrow(DomainValidationError);
    });
});

describe('AggregateRoot event ownership', () => {
    it('returns frozen event snapshots rather than its mutable queue', () => {
        const aggregate = new AccountAggregate('account-1');
        const first = new AccountEvent('account-1');
        const second = new AccountEvent('account-1');

        aggregate.addDomainEvent(first);
        const snapshot = aggregate.domainEvents;
        aggregate.addDomainEvent(second);

        expect(Object.isFrozen(snapshot)).toBe(true);
        expect(snapshot).toEqual([first]);
        expect(aggregate.domainEvents).toEqual([first, second]);
        expect(() => (snapshot as DomainEvent[]).push(second)).toThrow();

        aggregate.clearEvents();
        expect(aggregate.domainEvents).toEqual([]);
        expect(snapshot).toEqual([first]);
    });

    it('rejects values that are not DomainEvent instances', () => {
        expect(() => new AccountAggregate('account-1').addDomainEvent({} as DomainEvent)).toThrow(TypeError);
    });

    it('uses registry-backed DI symbols across package copies', () => {
        expect(Symbol.keyFor(DOMAIN_EVENT_PUBLISHER)).toBe('@a3s-lab/ddd/domain-event-publisher');
        expect(Symbol.keyFor(UNIT_OF_WORK)).toBe('@a3s-lab/ddd/unit-of-work');
        expect(DOMAIN_EVENT_PUBLISHER).toBe(Symbol.for('@a3s-lab/ddd/domain-event-publisher'));
    });
});
