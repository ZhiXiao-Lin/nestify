import { Module, Global } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { config } from '../config';
import { UserService } from './services/user.service';
import { JwtStrategy } from './strategys/jwt.strategy';
import { User } from './entities/user.entity';
import { Content } from './entities/content.entity';
import { Menu } from './entities/menu.entity';
import { Setting } from './entities/setting.entity';
import { SettingService } from './services/setting.service';

@Global()
@Module({
	imports: [
		PassportModule.register({ defaultStrategy: 'jwt' }),
		JwtModule.register(config.jwt),
		TypeOrmModule.forRoot(config.orm as TypeOrmModuleOptions),
		TypeOrmModule.forFeature([ Setting, Menu, User, Content ])
	],
	providers: [ JwtStrategy, SettingService, UserService ],
	exports: [ SettingService, UserService ]
})
export class CommonModule {}
