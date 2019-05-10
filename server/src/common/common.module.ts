import { Module, Global, CacheModule } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { config } from '../config';
import { UserService } from './services/user.service';
import { JwtStrategy } from './strategys/jwt.strategy';
import { User } from './entities/user.entity';
import { Content } from './entities/content.entity';
import { Category } from './entities/category.entity';
import { Setting } from './entities/setting.entity';
import { SettingService } from './services/setting.service';
import { CommonService } from './services/common.service';
import { CategoryService } from './services/category.service';

@Global()
@Module({
	imports: [
		// CacheModule.register({
		// 	...config.cache
		// }),
		PassportModule.register({ defaultStrategy: 'jwt' }),
		JwtModule.register(config.jwt),
		TypeOrmModule.forRoot(config.orm as TypeOrmModuleOptions),
		TypeOrmModule.forFeature([ Setting, Category, User, Content ])
	],
	providers: [ JwtStrategy, CommonService, SettingService, CategoryService, UserService ],
	exports: [ CommonService, SettingService, CategoryService, UserService ]
})
export class CommonModule {}
