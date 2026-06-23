export interface IRepository<TId, TEntity> {
    findById(id: TId): Promise<TEntity | null>;
    save(entity: TEntity): Promise<TEntity>;
    delete(id: TId): Promise<void>;
}
