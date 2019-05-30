import * as _ from 'lodash';
import * as moment from 'moment';
import { Entity, Column, ManyToOne, BeforeInsert, BeforeUpdate } from 'typeorm';
import { plainToClass, Expose } from 'class-transformer';
import { Base } from './base';
import { config } from '../../config';
import { Category } from './category.entity';
import { ExcelHandleType } from '../lib/excel';
import { textInterception } from '../lib/helper';

const handleType = ExcelHandleType.ARRAY;
const cellsMap = { 标题: 'title', 作者: 'author', 来源: 'source', 排序: 'sort', 发布时间: 'publish_at', 正文: 'text', 缩略图: 'thumbnail', 视频: 'video' };
const rowsMap = {
	id: {
		header: '编号',
	},
	title: {
		header: '标题',
	},
	author: {
		header: '作者',
	},
	source: {
		header: '来源',
	},
	sort: {
		header: '排序',
	},
	thumbnailPath: {
		header: '缩略图',
		key: 'thumbnail',
		handler: (val) => Content.getFullPath(val)
	},
	videoPath: {
		header: '视频',
		key: 'video',
		handler: (val) => Content.getFullPath(val)
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

@Entity()
export class Content extends Base {
	@Column({ comment: '标题' })
	title: string;

	@Column({ comment: '作者', default: '' })
	author: string;

	@Column({ comment: '来源', default: '本站' })
	source: string;

	@Column({ comment: '排序', default: 0 })
	sort: number;

	@Column({ comment: '缩略图', default: '' })
	thumbnail: string;

	@Column({ comment: '视频', default: '' })
	video: string;

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
		景区介绍: {
			handleType,
			cellsMap,
			rowsMap,
		},
		地理概况: {
			handleType,
			cellsMap,
			rowsMap,
		},
		人文历史: {
			handleType,
			cellsMap,
			rowsMap,
		},
		工艺特色: {
			handleType,
			cellsMap,
			rowsMap,
		},
		发展规划: {
			handleType,
			cellsMap,
			rowsMap,
		},
		当地特产: {
			handleType,
			cellsMap,
			rowsMap,
		},
		特色工艺品: {
			handleType,
			cellsMap,
			rowsMap,
		},
		游览须知: {
			handleType,
			cellsMap,
			rowsMap,
		},

		景点一览: {
			handleType,
			cellsMap,
			rowsMap,
		},
		全景720度: {
			map: '720度全景',
			handleType,
			cellsMap,
			rowsMap,
		},
		电子导游导览: {
			handleType,
			cellsMap,
			rowsMap,
		},
		摄影佳作: {
			handleType,
			cellsMap,
			rowsMap,
		},
		视频赏析: {
			handleType,
			cellsMap,
			rowsMap,
		},

		特色餐饮: {
			handleType,
			cellsMap,
			rowsMap,
		},
		周边住宿: {
			handleType,
			cellsMap,
			rowsMap,
		},
		旅游购物: {
			handleType,
			cellsMap,
			rowsMap,
		},
		周边娱乐: {
			handleType,
			cellsMap,
			rowsMap,
		},
		游程推荐: {
			handleType,
			cellsMap,
			rowsMap,
		},
		美文游记: {
			handleType,
			cellsMap,
			rowsMap,
		},

		官方公告: {
			handleType,
			cellsMap,
			rowsMap,
		},
		精彩活动: {
			handleType,
			cellsMap,
			rowsMap,
		},
		新闻动态: {
			handleType,
			cellsMap,
			rowsMap,
		},
	};

	static create(target: object): Content | Content[] {
		return plainToClass(Content, target);
	}

	static getFullPath(path) {
		return `${config.serverUrl}/${config.static.root}${path}`;
	}

	@Expose()
	get thumbnailPath(): string {
		return Content.getFullPath(this.thumbnail);
	}

	@Expose()
	get videoPath(): string {
		return Content.getFullPath(this.video);
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
