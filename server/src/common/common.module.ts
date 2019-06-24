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
            Category,
            User,
            Content,
            Organization,
            Role,
            Authority
        ])
    ],
    providers: [
        JwtStrategy,
        ImportService,
        CommonService,
        FlowService,
        CategoryService,
        ContentService,
        UserService,
        SettingService,
        OrganizationService,
        AuthorityService,
        RoleService,
        SearchService,
        StatusTask,
        WorkOrderFlow
    ],
    exports: [
        ImportService,
        CommonService,
        FlowService,
        CategoryService,
        ContentService,
        UserService,
        SettingService,
        OrganizationService,
        AuthorityService,
        RoleService,
        SearchService
    ]
})
export class CommonModule {}
