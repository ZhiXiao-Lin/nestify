import { Model } from 'mongoose';
import { RepositoryEvents } from './core.enums';
import { BaseInjectable } from './core.injectable';
import { IModel, IRepository } from './core.interfaces';

export abstract class BaseRepository<T extends IModel> extends BaseInjectable implements IRepository<T> {
    constructor(protected readonly model: Model<T>) {
        super();
    }

    async query(conditions: any): Promise<T[]> {
        conditions.isDeleted = false;
        this.logger.debug('Query by conditions:', conditions);

        this.event.publish(`${RepositoryEvents.BEFORE_LOAD}_${this.model.modelName}`, { conditions });

        const result = await this.model.find(conditions);

        this.event.publish(`${RepositoryEvents.AFTER_LOAD}_${this.model.modelName}`, { conditions, result });

        return result;
    }

    async create(doc: Partial<T>): Promise<T> {
        this.logger.debug('Create document:', doc);

        this.event.publish(`${RepositoryEvents.BEFORE_CREATE}_${this.model.modelName}`, { doc });

        doc = new this.model(doc);
        const result = (await doc.save()) as T;

        this.event.publish(`${RepositoryEvents.AFTER_CREATE}_${this.model.modelName}`, { result });

        return result;
    }

    async update(conditions: any, doc: Partial<T>): Promise<T> {
        this.logger.debug('Update by conditions:', conditions, doc);

        this.event.publish(`${RepositoryEvents.BEFORE_UPDATE}_${this.model.modelName}`, { conditions, doc });

        const result = await this.model.findOneAndUpdate(conditions, doc);

        this.event.publish(`${RepositoryEvents.AFTER_UPDATE}_${this.model.modelName}`, { conditions, doc });

        return result;
    }

    async remove(conditions: any): Promise<T | any> {
        this.logger.debug('Remove by conditions:', conditions);

        this.event.publish(`${RepositoryEvents.BEFORE_REMOVE}_${this.model.modelName}`, { conditions });

        let result = null;

        if (!!conditions.real) {
            result = await this.model.remove(conditions);
        } else {
            result = await this.model.findOneAndUpdate(conditions, { isDeleted: true });
        }

        this.event.publish(`${RepositoryEvents.AFTER_REMOVE}_${this.model.modelName}`, { conditions, result });

        return result;
    }
}
