import { Entity, Column, ManyToOne } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { Base } from './base';
import { User } from './user.entity';

@Entity()
export class Content extends Base {
	@Column({ comment: '标题' })
	title: string;

	@ManyToOne((type) => User, (user) => user.contents)
	user: User;

	static create(target: object) {
		return plainToClass(Content, target);
	}
}
