import { Injectable } from '@nestjs/common';
import { User } from '../models';
import { UserRepository } from '../repositories';
import { BaseUserService } from './base-user.service';

@Injectable()
export class UserService extends BaseUserService<User> {
    constructor(protected readonly repository: UserRepository) {
        super(repository);
    }

    async sendRegisterSmsCode(registerDto) {
        registerDto.code = '1234';
        return await this.notification.notify({ type: 'user', action: 'register-sms', context: registerDto });
    }
}
