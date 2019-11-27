import { Controller, Get } from '@nestjs/common';
import { BaseController } from '../../common/core';
import { User } from './user.interface';
import { UserService } from './user.service';

@Controller('user')
export class UserController extends BaseController<User> {
    constructor(protected readonly service: UserService) {
        super(service);
    }

    @Get()
    async index() {
        const users = await this.service.query({});
        const user = (users[0] || {}) as User;

        this.logger.info('user', user.id);

        return users;
    }

    @Get('test')
    async test() {
        return await this.service.create({ account: 'test', password: '12345678' });
    }
}
