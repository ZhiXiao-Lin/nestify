import { Module, Global } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { config } from '../config';
import { User } from './entities/user.entity';
import { Content } from './entities/content.entity';
import { UserService } from './services/user.service';
import { JwtStrategy } from './strategys/jwt.strategy';

@Global()
@Module({
	imports: [
		PassportModule.register({ defaultStrategy: 'jwt' }),
		JwtModule.register(config.jwt),
		TypeOrmModule.forRoot(config.orm as TypeOrmModuleOptions),
		TypeOrmModule.forFeature([ User, Content ])
	],
	providers: [ JwtStrategy, UserService ],
	exports: [ UserService ]
})
export class CommonModule {}
