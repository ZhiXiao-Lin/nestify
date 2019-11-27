import { Model } from 'mongoose';
import { BaseInjectable } from './core.injectable';
import { IModel, IRepository } from './core.interfaces';

export abstract class BaseRepository<T extends IModel> extends BaseInjectable implements IRepository<T> {
    constructor(protected readonly model: Model<T>) {
        super();
    }

    async query(conditions: any): Promise<T[]> {
        conditions.isDeleted = false;
        return await this.model.find(conditions);
    }

    async create(doc: Partial<T>): Promise<T> {
        doc = new this.model(doc);
        return (await doc.save()) as T;
    }

    async update(conditions: any, doc: Partial<T>): Promise<T> {
        return await this.model.findOneAndUpdate(conditions, doc);
    }

    async remove(conditions: any): Promise<T | any> {
        if (!!conditions.real) {
            return await this.model.remove(conditions);
        }
        return await this.model.findOneAndUpdate(conditions, { isDeleted: true });
    }
}
