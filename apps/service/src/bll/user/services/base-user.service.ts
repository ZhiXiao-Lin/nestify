import * as bcrypt from 'bcryptjs';
import { BaseService } from '../../../common/core';
import { BaseUserModel } from '../models';
import { BaseUserRepository } from '../repositories';

export abstract class BaseUserService<T extends BaseUserModel> extends BaseService<T> {
    constructor(protected readonly repository: BaseUserRepository<T>) {
        super(repository);
    }

    async encrypt(str: string): Promise<string> {
        return await bcrypt.hash(str + this.config.get('app.salt'), await bcrypt.genSalt());
    }

    async compare(str: string, hash: string): Promise<boolean> {
        return await bcrypt.compare(str + this.config.get('app.salt'), hash);
    }
}
