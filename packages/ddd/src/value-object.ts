import { domainValuesEqual, snapshotDomainValue } from './domain-value';
import { DomainValidationError } from './errors';

export type ValueObjectProps = object;

export abstract class ValueObject<T extends ValueObjectProps> {
    protected readonly props: T;

    constructor(props: T) {
        if (props === null || props === undefined || (typeof props !== 'object' && typeof props !== 'function')) {
            throw new DomainValidationError('ValueObject props must be an object.', { field: 'props' });
        }
        this.props = snapshotDomainValue(props);
    }

    equals(vo?: ValueObject<T>): boolean {
        if (vo === null || vo === undefined) {
            return false;
        }
        if (this === vo) return true;
        if (this.constructor !== vo.constructor) return false;
        return domainValuesEqual(this.props, vo.props);
    }

    toObject(): T {
        return snapshotDomainValue(this.props);
    }
}
