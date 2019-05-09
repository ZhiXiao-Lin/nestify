import * as _ from 'lodash';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserService {
	constructor(
		private readonly jwtService: JwtService,
		@InjectRepository(User) private readonly userRepository: Repository<User>
	) {}

	async getOneById(id: string) {
		return await this.userRepository.findOne({ where: { id } });
	}

	async login(mobile, password) {
		const user = await this.userRepository.findOne({ mobile });

		if (!user) throw new UnauthorizedException('用户不存在!');

		if (!await bcrypt.compare(password, user.password)) throw new UnauthorizedException('密码错误!');

		return await this.jwtService.sign(_.toPlainObject(user));
	}
}
