import { Controller, Get } from '@nestjs/common';
import { BaseController } from '../../../common/core';
import { Admin, User } from '../models';
import { AdminService } from '../services';

@Controller('admin')
export class AdminController extends BaseController<Admin> {
    constructor(protected readonly service: AdminService) {
        super(service);
    }

    @Get()
    async index() {
        const users = await this.service.query({});
        const user = (users[0] || {}) as User;

        this.logger.info('user', user.id);

        await this.cache.set('user', user, { ttl: 10 });

        return user;
    }

    @Get('cache')
    async cacheVal() {
        return await this.cache.get('user');
    }
}
