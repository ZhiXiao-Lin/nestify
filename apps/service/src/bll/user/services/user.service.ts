import { Injectable } from '@nestjs/common';
import { User } from '../models';
import { UserRepository } from '../repositories';
import { BaseUserService } from './base-user.service';

@Injectable()
export class UserService extends BaseUserService<User> {
    constructor(protected readonly repository: UserRepository) {
        super(repository);
    }
}
