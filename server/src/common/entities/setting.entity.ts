import { Base } from './base';
import { Entity, Column } from 'typeorm';

@Entity()
export class Setting extends Base {
	constructor(token?: string, exInfo: any = {}) {
		super();

		this.token = token;
		this.ex_info = exInfo;
	}

	@Column({ comment: '标志', unique: true })
	token: string;
}
