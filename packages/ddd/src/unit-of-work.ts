export interface IUnitOfWork {
    start(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}

export const UNIT_OF_WORK = Symbol.for('@a3s-lab/ddd/unit-of-work');
