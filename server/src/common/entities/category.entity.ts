import { Base } from './base';
import { Entity, Column, Tree, TreeChildren, TreeParent } from 'typeorm';

@Entity()
@Tree('materialized-path')
export class Category extends Base {
	constructor(name: string, url: string, sort: number = 0, parent: Category = null) {
		super();

		this.name = name;
		this.url = url;
		this.sort = sort;
		this.parent = parent;
	}

	@Column({ comment: '名称' })
	name: string;

	@Column({ comment: '地址' })
	url: string;

	@Column({ comment: '排序', default: 0 })
	sort: number;

	@TreeChildren() children: Category[];

	@TreeParent() parent: Category;
}
