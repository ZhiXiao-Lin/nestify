import { Base } from './base';
import { Entity, Column, Tree, TreeChildren, TreeParent, OneToMany } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { ExcelHandleType } from '../lib/excel';
import { Content } from './content.entity';

@Entity()
@Tree('materialized-path')
export class Category extends Base {
	@Column({ comment: '名称' })
	name: string;

	@Column({ comment: '排序', default: 0 })
	sort: number;

	@Column({ type: 'simple-json', default: {}, comment: '扩展信息' })
	ex_info: any;

	@OneToMany((type) => Content, (content) => content.category)
	contents: Content[];

	@TreeChildren() children: Category[];

	@TreeParent() parent: Category;

	static readonly sheetsMap: object = {
		分类: {
			map: 'categorys',
			handleType: ExcelHandleType.ARRAY,
			cellsMap: { ID: 'id', 名称: 'name', 排序: 'sort', PID: 'parent' }
		}
	};

	static create(target: object) {
		return plainToClass(Category, target);
	}
}
