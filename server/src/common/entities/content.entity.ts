import { Entity, Column, ManyToOne, CreateDateColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { Base } from './base';
import { Category } from './category.entity';
import { ExcelHandleType } from '../lib/excel';
import { textInterception } from '../lib/helper';

@Entity()
export class Content extends Base {
	@Column({ comment: '标题' })
	title: string;

	@Column({ comment: '作者', default: '' })
	author: string;

	@Column({ comment: '排序', default: 0 })
	sort: number;

	@Column({ comment: '缩略图', default: '' })
	thumbnail: string;

	@Column({ comment: '摘要', default: '' })
	summary: string;

	@Column({ comment: '正文', default: '' })
	text: string;

	@CreateDateColumn({
		comment: '发布时间'
	})
	publish_at: number;

	@ManyToOne((type) => Category, (category) => category.contents)
	category: Category;

	static readonly sheetsMap: object = {
		官方公告: {
			map: '官方公告',
			handleType: ExcelHandleType.ARRAY,
			cellsMap: { 标题: 'title', 作者: 'author', 排序: 'sort', 发布时间: 'publish_at', 正文: 'text', 缩略图: 'thumbnail' }
		},
		精彩活动: {
			map: '精彩活动',
			handleType: ExcelHandleType.ARRAY,
			cellsMap: { 标题: 'title', 作者: 'author', 排序: 'sort', 发布时间: 'publish_at', 正文: 'text', 缩略图: 'thumbnail' }
		},
		新闻动态: {
			map: '新闻动态',
			handleType: ExcelHandleType.ARRAY,
			cellsMap: { 标题: 'title', 作者: 'author', 排序: 'sort', 发布时间: 'publish_at', 正文: 'text', 缩略图: 'thumbnail' }
		}
	};

	static create(target: object): Content | Content[] {
		return plainToClass(Content, target);
	}

	@BeforeInsert()
	async beforeInsert() {
		this.summary = textInterception(this.text, 120);
	}

	@BeforeUpdate()
	async beforeUpdate() {
		this.summary = textInterception(this.text, 120);
	}
}
