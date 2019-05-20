import { Base } from './base';
import { Entity, Column } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { ExcelHandleType } from '../lib/excel';

@Entity()
export class Setting extends Base {
	@Column({ comment: '标志', unique: true })
	token: string;

	static readonly sheetsMap: object = {
		系统设置: {
			map: 'setting',
			handleType: ExcelHandleType.KV,
			rowsMap: {
				网站标题: 'title',
				技术支持: 'techSupport',
				微信二维码: 'wechat',
				微博二维码: 'weibo',
				地址: 'address',
				乘车路线: 'busLine',
				邮编: 'postCode',
				传真: 'fax',
				服务热线: 'serviceLine',
				销售热线: 'saleLine',
				官方热线: 'officialLine',
				在线预订: 'onlineSaleUrl',
				版权: 'copyright',
				备案号: 'icp',
				公网安备: 'pns'
			}
		},
		全站SEO: {
			map: 'seo',
			handleType: ExcelHandleType.KV,
			rowsMap: { 标题: 'title', 关键词: 'keywords', 描述: 'description' }
		},
		友情链接: {
			map: 'links',
			handleType: ExcelHandleType.ARRAY,
			cellsMap: { 标题: 'title', 地址: 'url' }
		}
	};

	static create(target: object) {
		return plainToClass(Setting, target);
	}
}
