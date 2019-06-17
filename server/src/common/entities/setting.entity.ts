import { Base } from './base';
import { Entity, Column } from 'typeorm';
import { plainToClass, Expose } from 'class-transformer';
import { ExcelHandleType } from '../lib/excel';

@Entity()
export class Setting extends Base {
	@Column({ comment: '标志', unique: true })
	token: string;

	@Column({ type: 'simple-json', default: {}, comment: '扩展信息' })
	ex_info: any;

	static readonly sheetsMap: object = {
		系统设置: {
			map: 'setting',
			handleType: ExcelHandleType.KV,
			rowsMap: {
				介绍: 'recommendation',
				网站标题: 'title',
				技术支持: 'techSupport',
				微信二维码: 'wechat',
				微博二维码: 'weibo',
				地址: 'address',
				乘车路线: 'busLine',
				邮编: 'postcode',
				传真: 'fax',
				服务热线: 'serviceHotline',
				售票热线: 'bookingHotline',
				合作热线: 'cooperationHotline',
				办公电话: 'officeTel',
				预订链接: 'onlineSaleUrl',
				版权: 'copyright',
				备案号: 'icp',
				公网安备: 'pns',
				游玩时间: 'openInfo'
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
			cellsMap: { ID: 'id', 标题: 'title', 地址: 'url', 排序: 'sort' }
		}
	};

	static create(target: object) {
		return plainToClass(Setting, target);
	}

	@Expose()
	get wechatImg() {
		return Base.getFullPath(this.ex_info.setting ? this.ex_info.setting.wechat : null)
	}

	@Expose()
	get weiboImg() {
		return Base.getFullPath(this.ex_info.setting ? this.ex_info.setting.weibo : null)
	}
}
