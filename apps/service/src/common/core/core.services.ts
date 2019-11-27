import { BaseInjectable } from './core.injectable';
import { IModel, IRepository, IService } from './core.interfaces';

export abstract class BaseService<T extends IModel> extends BaseInjectable implements IService<T> {
    constructor(protected readonly repository: IRepository<T>) {
        super();
    }

    async query(conditions: any): Promise<T[]> {
        this.logger.debug('Query by conditions:', conditions);
        return await this.repository.query(conditions);
    }

    async create(doc: Partial<T>): Promise<T> {
        this.logger.debug('Create document:', doc);
        return await this.repository.create(doc);
    }

    async update(conditions: any, doc: Partial<T>): Promise<T> {
        this.logger.debug('Update by conditions:', conditions, doc);
        return await this.repository.update(conditions, doc);
    }

    async remove(conditions: any): Promise<T | any> {
        this.logger.debug('Remove by conditions:', conditions);
        return await this.repository.remove(conditions);
    }
}
