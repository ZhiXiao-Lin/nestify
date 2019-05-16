import { Base } from './base';
import { Entity, Column, Tree, TreeChildren, TreeParent } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { ExcelHandleType } from '../lib/excel';

@Entity()
@Tree('materialized-path')
export class Category extends Base {
	@Column({ comment: '名称' })
	name: string;

	@Column({ comment: '地址' })
	url: string;

	@Column({ comment: '排序', default: 0 })
	sort: number;

	@TreeChildren() children: Category[];

	@TreeParent() parent: Category;

	static readonly sheetsMap: object = {
		分类: {
			map: 'categorys',
			handleType: ExcelHandleType.ARRAY,
			cellsMap: { ID: 'id', 名称: 'name', 链接: 'url', 排序: 'sort', PID: 'parent' }
		}
	};

	static create(target: object) {
		return plainToClass(Category, target);
	}
}
