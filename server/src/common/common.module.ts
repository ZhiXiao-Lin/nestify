import { Module, Global } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ScheduleModule } from 'nest-schedule';
import { config } from '../config';
import { UserService } from './services/user.service';
import { JwtStrategy } from './strategys/jwt.strategy';
import { User } from './entities/user.entity';
import { Content } from './entities/content.entity';
import { Flow } from './entities/flow.entity';
import { Category } from './entities/category.entity';
import { Setting } from './entities/setting.entity';
import { Organization } from './entities/organization.entity';
import { Role } from './entities/role.entity';
import { Authority } from './entities/authority.entity';
import { ServiceCategory } from './entities/service-category.entity';
import { Service } from './entities/service.entity';
import { CommonService } from './services/common.service';
import { SettingService } from './services/setting.service';
import { ImportService } from './services/import.service';
import { CategoryService } from './services/category.service';
import { ContentService } from './services/content.service';
import { StatusTask } from './tasks/status.task';
import { OrganizationService } from './services/organization.service';
import { RoleService } from './services/role.service';
import { AuthorityService } from './services/authority.service';
import { SearchService } from './services/search.service';
import { FlowService } from './services/flow.service';
import { WorkOrderFlow } from './flows/work-order.flow';
import { ServiceCategoryService } from './services/service-category.service';
import { ServiceService } from './services/service.service';
import { Carousel } from './entities/carousel.entity';
import { CarouselService } from './services/carousel.service';
import { ApplyVolunteerFlow } from './flows/apply-volunteer.flow';
import { FlowTemplate } from './entities/flow-template.entity';
import { FlowTemplateService } from './services/flow-template.service';
import { Notice } from './entities/notice.entity';
import { Feedback } from './entities/feedback.entity';
import { FeedbackService } from './services/feedback.service';
import { Detail } from './entities/detail.entity';

@Global()
@Module({
    imports: [
        ScheduleModule.register(),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register(config.jwt),
        TypeOrmModule.forRoot(config.orm as TypeOrmModuleOptions),
        TypeOrmModule.forFeature([
            Setting,
            Flow,
            FlowTemplate,
            Category,
            Carousel,
            User,
            Content,
            Organization,
            Role,
            Authority,
            Service,
            ServiceCategory,
            Notice,
            Feedback,
            Detail
        ])
    ],
    providers: [
        JwtStrategy,
        ImportService,
        CommonService,
        FlowService,
        CarouselService,
        CategoryService,
        ContentService,
        ServiceCategoryService,
        ServiceService,
        UserService,
        SettingService,
        OrganizationService,
        AuthorityService,
        RoleService,
        SearchService,
        FlowTemplateService,
        FeedbackService,
        StatusTask,
        WorkOrderFlow,
        ApplyVolunteerFlow,
    ],
    exports: [
        ImportService,
        CommonService,
        FlowService,
        CarouselService,
        CategoryService,
        ServiceCategoryService,
        ServiceService,
        ContentService,
        UserService,
        SettingService,
        OrganizationService,
        AuthorityService,
        RoleService,
        SearchService,
        FlowTemplateService,
        FeedbackService,
    ]
})
export class CommonModule { }
