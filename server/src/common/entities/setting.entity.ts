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
				标题: 'title',
				描述: 'desc',
				地址: 'address',
				邮编: 'postcode',
				邮箱: 'email',
				电话: 'tel',
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
			cellsMap: { ID: 'id', 标题: 'title', 描述: 'desc', 地址: 'url', 排序: 'sort' }
		}
	};

	static create(target: object) {
		return plainToClass(Setting, target);
	}

	@Expose()
	get logoLightImg() {
		return Base.getFullPath(this.ex_info.setting ? this.ex_info.setting.logoLight : null)
	}

	@Expose()
	get logoDarkImg() {
		return Base.getFullPath(this.ex_info.setting ? this.ex_info.setting.logoDark : null)
	}
}
