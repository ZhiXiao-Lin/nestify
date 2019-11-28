import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/core';
import { BaseUserModel } from '../models';

export abstract class BaseUserRepository<T extends BaseUserModel> extends BaseRepository<T> {
    constructor(
        protected readonly model: Model<T>
    ) {
        super(model);
    }
}
