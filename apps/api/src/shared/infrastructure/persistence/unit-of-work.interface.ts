export interface IUnitOfWork {
    start(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
