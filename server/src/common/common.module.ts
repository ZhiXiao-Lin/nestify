import { Module, Global, CacheModule } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { RedisModule } from 'nestjs-redis'
import { ScheduleModule } from 'nest-schedule';
import { config } from '../config';
import { UserService } from './services/user.service';
import { JwtStrategy } from './strategys/jwt.strategy';
import { User } from './entities/user.entity';
import { Content } from './entities/content.entity';
import { Category } from './entities/category.entity';
import { Setting } from './entities/setting.entity';
import { CommonService } from './services/common.service';
import { SettingService } from './services/setting.service';
import { ImportService } from './services/import.service';
import { CategoryService } from './services/category.service';
import { ContentService } from './services/content.service';
import { StatusTask } from './tasks/status.task';

@Global()
@Module({
	imports: [
		// CacheModule.register({
		// 	...config.cache
		// }),
		RedisModule.register(config.redis),
		ScheduleModule.register(),
		PassportModule.register({ defaultStrategy: 'jwt' }),
		JwtModule.register(config.jwt),
		TypeOrmModule.forRoot(config.orm as TypeOrmModuleOptions),
		TypeOrmModule.forFeature([Setting, Category, User, Content])
	],
	providers: [
		JwtStrategy,
		ImportService,
		CommonService,
		CategoryService,
		ContentService,
		UserService,
		SettingService,
		StatusTask
	],
	exports: [ImportService, CommonService, CategoryService, ContentService, UserService, SettingService]
})
export class CommonModule { }
