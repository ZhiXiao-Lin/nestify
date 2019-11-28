import { Model } from 'mongoose';
import { BaseInjectable } from './core.injectable';
import { IModel, IRepository } from './core.interfaces';

export abstract class BaseRepository<T extends IModel> extends BaseInjectable implements IRepository<T> {
    constructor(protected readonly model: Model<T>) {
        super();
    }

    async query(conditions: any): Promise<T[]> {
        conditions.isDeleted = false;
        this.logger.debug('Query by conditions:', conditions);

        const result = await this.model.find(conditions);

        return result;
    }

    async create(doc: Partial<T>): Promise<T> {
        this.logger.debug('Create document:', doc);

        doc = new this.model(doc);
        const result = (await doc.save()) as T;

        return result;
    }

    async update(conditions: any, doc: Partial<T>): Promise<T> {
        this.logger.debug('Update by conditions:', conditions, doc);

        const result = await this.model.findOneAndUpdate(conditions, doc);

        return result;
    }

    async remove(conditions: any): Promise<T | any> {
        this.logger.debug('Remove by conditions:', conditions);

        let result = null;

        if (!!conditions.real) {
            result = await this.model.remove(conditions);
        } else {
            result = await this.model.findOneAndUpdate(conditions, { isDeleted: true });
        }

        return result;
    }
}
