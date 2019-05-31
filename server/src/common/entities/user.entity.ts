import * as bcrypt from 'bcryptjs';
import { Exclude, plainToClass } from 'class-transformer';
import { Base } from './base';
import { Entity, Column, BeforeInsert } from 'typeorm';

@Entity()
export class User extends Base {
	@Column({
		comment: '帐号',
		unique: true
	})
	account: string;

	@Exclude({ toPlainOnly: true })
	@Column({ comment: '密码' })
	password: string;

	@Column({ type: 'simple-json', default: {}, comment: '扩展信息' })
	ex_info: any;

	static create(target: Object) {
		return plainToClass(User, target);
	}

	@BeforeInsert()
	async beforeInsert() {
		const salt = await bcrypt.genSalt(10);
		this.password = await bcrypt.hash(this.password, salt);
	}
}
