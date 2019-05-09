import { Base } from './base';
import { Entity, Column } from 'typeorm';

@Entity()
export class Menu extends Base {
	constructor(name: string, url: string, sort: number = 0) {
		super();

		this.name = name;
		this.url = url;
		this.sort = sort;
	}

	@Column({ comment: '名称' })
	name: string;

	@Column({ comment: '地址' })
	url: string;

	@Column({ comment: '排序', default: 0 })
	sort: number;
}
