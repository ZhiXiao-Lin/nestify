import { CryptService } from '@nestify/crypt';
import { InjectCrypt } from '../../../common';
import { BaseService } from '../../../common/core';
import { BaseUserModel } from '../models';
import { BaseUserRepository } from '../repositories';

export abstract class BaseUserService<T extends BaseUserModel> extends BaseService<T> {
    @InjectCrypt()
    protected readonly crypt: CryptService;

    constructor(protected readonly repository: BaseUserRepository<T>) {
        super(repository);
    }

    async encrypt(str: string): Promise<string> {
        return await this.crypt.encrypt(str);
    }

    async compare(str: string, hash: string): Promise<boolean> {
        return await this.crypt.compare(str, hash);
    }
}
