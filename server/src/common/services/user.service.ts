import * as _ from 'lodash';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
	constructor(
		private readonly jwtService: JwtService,
		@InjectRepository(User) private readonly userRepository: Repository<User>
	) {}

	async findOneById(id: string) {
		return await this.userRepository.findOne({ id });
	}

	async login(account, password) {
		const user = await this.userRepository.findOne({ account });

		if (!user) throw new UnauthorizedException('用户不存在!');

		if (!await bcrypt.compare(password, user.password)) throw new UnauthorizedException('密码错误!');

		return await this.jwtService.sign(_.toPlainObject(user));
	}
}
