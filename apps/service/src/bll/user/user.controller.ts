import { Controller } from '@nestjs/common';
import { BaseController } from '../../common/core';
import { User } from './user.interface';
import { UserService } from './user.service';

@Controller('user')
export class UserController extends BaseController<User> {
    constructor(protected readonly service: UserService) {
        super(service);
    }
}
