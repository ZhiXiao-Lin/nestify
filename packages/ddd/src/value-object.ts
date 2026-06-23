export type ValueObjectProps = object;

export abstract class ValueObject<T extends ValueObjectProps> {
    protected readonly props: T;

    constructor(props: T) {
        this.props = Object.freeze({ ...props }) as T;
    }

    equals(vo?: ValueObject<T>): boolean {
        if (vo === null || vo === undefined) {
            return false;
        }
        return JSON.stringify(this.props) === JSON.stringify(vo.props);
    }

    toObject(): T {
        return this.props;
    }
}
