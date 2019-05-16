import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { config } from '../../config';
import { User } from '../entities/user.entity';
import { UserService } from '../services/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private readonly userService: UserService) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey: config.jwt.secretOrPrivateKey
		});
	}

	async validate(payload: User) {
		const user = await this.userService.findOneById(payload.id);
		if (!user) {
			throw new UnauthorizedException('身份验证失败');
		}
		return user;
	}
}
