import { resolve } from 'path';
import { Injectable } from '@nestjs/common';
import { User } from '../common/entities/user.entity';
import { Category } from '../common/entities/category.entity';
import { Setting } from '../common/entities/setting.entity';
import { ExcelHelper } from '../common/lib/excel';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { Logger } from '../common/lib/logger';
import { Organization } from 'src/common/entities/organization.entity';

@Injectable()
export class Seed {
	constructor(@InjectConnection() private readonly connection: Connection) { }

	async start() {
		Logger.log('seed start');

		await this.connection.getRepository(Setting).save({
			token: 'default',
			ex_info: await ExcelHelper.loadFromFile(resolve('./seeds/settings.xlsx'), Setting.sheetsMap)
		});

		await this.connection.getRepository(User).save(User.create({ account: 'SysAdmin', password: '12345678' }));

		const categorysResult = await ExcelHelper.loadFromFile(resolve('./seeds/categorys.xlsx'), Category.sheetsMap);
		const categorys = categorysResult['categorys'];
		const categoryArr = [];

		categorys.forEach((item) => {
			if (!!item.parent) {
				item.parent = categoryArr.find((cate) => cate.id === item.parent);
			}
			categoryArr.push(Category.create(item));
		});
		await this.connection.getTreeRepository(Category).save(categoryArr);

		const organizationsResult = await ExcelHelper.loadFromFile(resolve('./seeds/organizations.xlsx'), Organization.sheetsMap);
		const organizations = organizationsResult['organizations'];
		const organizationArr = [];

		organizations.forEach((item) => {
			if (!!item.parent) {
				item.parent = organizationArr.find((org) => org.id === item.parent);
			}
			organizationArr.push(Organization.create(item));
		});
		await this.connection.getTreeRepository(Organization).save(organizationArr);
	}
}
