import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { BaseService } from '../../common/core';
import { User } from './user.interface';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService extends BaseService<User> {
    constructor(protected readonly repository: UserRepository) {
        super(repository);
    }

    async encrypt(str: string): Promise<string> {
        return await bcrypt.hash(str + this.config.get('app.salt'), await bcrypt.genSalt());
    }

    async compare(str: string, hash: string): Promise<boolean> {
        return await bcrypt.compare(str + this.config.get('app.salt'), hash);
    }
}
