import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { logger } from '../common/aspects/middlewares';
import { LoginController } from './controllers/login.controller';
import { UserController } from './controllers/user.controller';
import { StorageController } from './controllers/storage.controller';
import { ContentController } from './controllers/content.controller';
import { SettingController } from './controllers/setting.controller';
import { CategoryController } from './controllers/category.controller';
import { OrganizationController } from './controllers/organization.controller';
import { RoleController } from './controllers/role.controller';
import { AuthorityController } from './controllers/authority.controller';
import { SearchController } from './controllers/search.controller';
import { ServiceCategoryController } from './controllers/service-category.controller';
import { ServiceController } from './controllers/service.controller';
import { CarouselController } from './controllers/carousel.controller';
import { FlowTemplateController } from './controllers/flow-template.controller';
import { FlowController } from './controllers/flow.controller';
import { FeedbackController } from './controllers/feedback.controller';

@Module({
    controllers: [
        StorageController,
        SettingController,
        LoginController,
        UserController,
        ContentController,
        CategoryController,
        CarouselController,
        ServiceController,
        ServiceCategoryController,
        OrganizationController,
        AuthorityController,
        RoleController,
        SearchController,
        FlowController,
        FlowTemplateController,
        FeedbackController
    ]
})
export class ApiModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(logger).forRoutes('*');
    }
}
