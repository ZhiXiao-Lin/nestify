import * as bcrypt from 'bcryptjs';
import { Exclude } from 'class-transformer';
import { Base } from './base';
import { Entity, Column, BeforeInsert, OneToMany } from 'typeorm';
import { Content } from './content.entity';

@Entity()
export class User extends Base {
	@Column({
		comment: '手机号',
		unique: true
	})
	mobile: string;

	@Exclude()
	@Column({ comment: '密码' })
	password: string;

	@OneToMany((type) => Content, (content) => content.user)
	contents: Content[];

	@BeforeInsert()
	async beforeInsert() {
		const salt = await bcrypt.genSalt(10);
		this.password = await bcrypt.hash(this.password, salt);
	}
}
