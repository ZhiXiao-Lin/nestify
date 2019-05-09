import { Base } from './base';
import { Entity, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Content extends Base {
	@Column({ comment: '标题' })
	title: string;

	@ManyToOne((type) => User, (user) => user.contents)
	user: User;
}
