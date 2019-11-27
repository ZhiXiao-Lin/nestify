import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from 'src/common/core';
import { User } from './user.interface';
import { UserModelToken } from './user.model';

@Injectable()
export class UserRepository extends BaseRepository<User> {
    constructor(
        @InjectModel(UserModelToken)
        protected readonly model: Model<User>
    ) {
        super(model);
    }
}
