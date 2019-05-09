import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { User } from '../common/entities/user.entity';
import { Content } from '../common/entities/content.entity';

@Injectable()
export class Seed {
	constructor(
		@InjectConnection() private readonly connection: Connection,
		@InjectRepository(User) private readonly userRepository: Repository<User>
	) {}

	async start() {
		console.log('seed start');

		const admin = new User();
		admin.mobile = '18770221825';
		admin.password = '12345678';
		await this.userRepository.save(admin);

		await this.connection.getRepository(Content).insert([
			{
				title: '这是一篇测试文章',
				user: admin
			}
		]);
	}
}
