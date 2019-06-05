import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { logger } from '../common/aspects/middlewares';
import { LoginController } from './controllers/login.controller';
import { UserController } from './controllers/user.controller';
import { StorageController } from './controllers/storage.controller';
import { ContentController } from './controllers/content.controller';
import { SettingController } from './controllers/setting.controller';
import { CategoryController } from './controllers/category.controller';
import { OrganizationController } from './controllers/organization.controller';

@Module({
    controllers: [
        StorageController,
        SettingController,
        LoginController,
        UserController,
        ContentController,
        CategoryController,
        OrganizationController
    ]
})
export class ApiModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(logger).forRoutes('*');
    }
}
