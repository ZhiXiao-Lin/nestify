import { AggregateRoot, DomainEvent, Entity, Guard, Result, ValueObject, voidOk } from '../index';

class TestEntity extends Entity<string> {}

class TestAggregate extends AggregateRoot<string> {}

class TestEvent extends DomainEvent {
    constructor(private readonly aggregateId: string) {
        super();
    }

    getAggregateId(): string {
        return this.aggregateId;
    }
}

class TestValueObject extends ValueObject<{ amount: number; currency: string }> {}

describe('ddd primitives', () => {
    it('compares entities by identity value', () => {
        const entity = new TestEntity('entity-1');

        expect(entity.equals(new TestEntity('entity-1'))).toBe(true);
        expect(entity.equals(new TestEntity('entity-2'))).toBe(false);
        expect(entity.equalsById('entity-1')).toBe(true);
        expect(entity.toObject()).toEqual({ id: 'entity-1' });
    });

    it('stores and clears domain events on aggregates', () => {
        const aggregate = new TestAggregate('aggregate-1');
        const event = new TestEvent('aggregate-1');

        aggregate.addDomainEvent(event);

        expect(aggregate.domainEvents).toEqual([event]);
        expect(event.getAggregateId()).toBe('aggregate-1');

        aggregate.clearEvents();

        expect(aggregate.domainEvents).toEqual([]);
    });

    it('compares value objects by frozen props', () => {
        const left = new TestValueObject({ amount: 10, currency: 'USD' });
        const right = new TestValueObject({ amount: 10, currency: 'USD' });

        expect(left.equals(right)).toBe(true);
        expect(Object.isFrozen(left.toObject())).toBe(true);
    });

    it('maps, folds, and combines successful results', () => {
        const result = Result.ok(2)
            .map(value => value * 2)
            .flatMap(value => Result.ok(value + 1));

        expect(result.getValue()).toBe(5);
        expect(
            result.fold(
                value => `ok:${value}`,
                error => `fail:${error}`,
            ),
        ).toBe('ok:5');
        expect(Result.combine(Result.ok(1), Result.ok('a')).getValue()).toEqual([1, 'a']);
        expect(voidOk().isSuccess).toBe(true);
    });

    it('keeps failure state through transformations', () => {
        const result = Result.fail<number>('bad').map(value => value * 2);

        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('bad');
        expect(() => result.getValue()).toThrow('Result is in failure state');
        expect(Result.combineAll(Result.ok(1), Result.fail<number>('bad')).error).toContain('Multiple failures');
    });

    it('validates common guard conditions', () => {
        expect(Guard.againstNullOrUndefined(undefined, 'value')).toEqual({
            succeeded: false,
            message: 'value is null or undefined',
        });
        expect(Guard.isOneOf('a', ['a', 'b'], 'letter').succeeded).toBe(true);
        expect(Guard.inRange(5, 1, 10, 'count').succeeded).toBe(true);
        expect(Guard.allInRange([1, 2, 11], 1, 10, 'counts').succeeded).toBe(false);
    });
});
