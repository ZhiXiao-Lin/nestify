import * as _ from 'lodash';
import * as moment from 'moment';
import { Entity, Column, ManyToOne, BeforeInsert, BeforeUpdate } from 'typeorm';
import { plainToClass, Expose } from 'class-transformer';
import { Base } from './base';
import { config } from '../../config';
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

	@Column({ type: 'bigint', comment: '浏览量', default: 0 })
	views: number;

	@Column({
		type: 'timestamp',
		comment: '发布时间'
	})
	publish_at: string;

	@ManyToOne((type) => Category, (category) => category.contents)
	category: Category;

	static readonly sheetsMap: object = {
		官方公告: {
			map: '官方公告',
			handleType: ExcelHandleType.ARRAY,
			cellsMap: { 标题: 'title', 作者: 'author', 排序: 'sort', 发布时间: 'publish_at', 正文: 'text', 缩略图: 'thumbnail' },
			rowsMap: {
				id: {
					header: '编号',
				},
				title: {
					header: '标题',
				},
				author: {
					header: '作者',
				},
				sort: {
					header: '排序',
				},
				thumbnailPath: {
					header: '缩略图',
					key: 'thumbnail',
					handler: (val) => Content.getFullThumbnailPath(val)
				},
				summary: {
					header: '摘要',
				},
				text: {
					header: '正文',
				},
				views: {
					header: '浏览量',
				},
				publish_at: {
					header: '发布时间',
					handler: (val) => val ? moment(val).format('YYYY-MM-DD HH:mm:ss') : ''
				},
				update_at: {
					header: '修改时间',
					handler: (val) => val ? moment(val).format('YYYY-MM-DD HH:mm:ss') : ''
				},
				category: {
					header: '分类',
					handler: (val) => val ? val.name : ''
				},
			}
		},
		精彩活动: {
			map: '精彩活动',
			handleType: ExcelHandleType.ARRAY,
			cellsMap: { 标题: 'title', 作者: 'author', 排序: 'sort', 发布时间: 'publish_at', 正文: 'text', 缩略图: 'thumbnail' },
			rowsMap: {
				id: {
					header: '编号',
				},
				title: {
					header: '标题',
				},
				author: {
					header: '作者',
				},
				sort: {
					header: '排序',
				},
				thumbnailPath: {
					header: '缩略图',
					key: 'thumbnail',
					handler: (val) => Content.getFullThumbnailPath(val)
				},
				summary: {
					header: '摘要',
				},
				text: {
					header: '正文',
				},
				views: {
					header: '浏览量',
				},
				publish_at: {
					header: '发布时间',
					handler: (val) => val ? moment(val).format('YYYY-MM-DD HH:mm:ss') : ''
				},
				update_at: {
					header: '修改时间',
					handler: (val) => val ? moment(val).format('YYYY-MM-DD HH:mm:ss') : ''
				},
				category: {
					header: '分类',
					handler: (val) => val ? val.name : ''
				},
			}
		},
		新闻动态: {
			map: '新闻动态',
			handleType: ExcelHandleType.ARRAY,
			cellsMap: { 标题: 'title', 作者: 'author', 排序: 'sort', 发布时间: 'publish_at', 正文: 'text', 缩略图: 'thumbnail' },
			rowsMap: {
				id: {
					header: '编号',
				},
				title: {
					header: '标题',
				},
				author: {
					header: '作者',
				},
				sort: {
					header: '排序',
				},
				thumbnailPath: {
					header: '缩略图',
					key: 'thumbnail',
					handler: (val) => Content.getFullThumbnailPath(val)
				},
				summary: {
					header: '摘要',
				},
				text: {
					header: '正文',
				},
				views: {
					header: '浏览量',
				},
				publish_at: {
					header: '发布时间',
					handler: (val) => val ? moment(val).format('YYYY-MM-DD HH:mm:ss') : ''
				},
				update_at: {
					header: '修改时间',
					handler: (val) => val ? moment(val).format('YYYY-MM-DD HH:mm:ss') : ''
				},
				category: {
					header: '分类',
					handler: (val) => val ? val.name : ''
				},
			}
		}
	};

	static create(target: object): Content | Content[] {
		return plainToClass(Content, target);
	}

	static getFullThumbnailPath(path) {
		return `${config.serverUrl}/${config.static.root}${path}`;
	}

	@Expose()
	get thumbnailPath(): string {
		return Content.getFullThumbnailPath(this.thumbnail);
	}

	@BeforeInsert()
	async beforeInsert() {
		if (_.isEmpty(this.publish_at)) {
			this.publish_at = moment().format('YYYY-MM-DD HH:mm:ss');
		}
		this.summary = textInterception(this.text, 120);
	}

	@BeforeUpdate()
	async beforeUpdate() {
		this.summary = textInterception(this.text, 120);
	}
}
