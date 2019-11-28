import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Repository } from '../../../common/core';
import { User, UserModelName } from '../models';
import { BaseUserRepository } from './base-user.repository';

@Repository()
export class UserRepository extends BaseUserRepository<User> {
    constructor(
        @InjectModel(UserModelName)
        protected readonly model: Model<User>
    ) {
        super(model);
    }
}
