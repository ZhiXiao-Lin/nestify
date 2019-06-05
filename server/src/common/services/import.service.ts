import { Injectable } from '@nestjs/common';
import { ExcelHelper } from '../lib/excel';
import { Content } from '../entities/content.entity';
import { Organization } from '../entities/organization.entity';
import { CategoryService } from './category.service';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';


@Injectable()
export class ImportService {
	constructor(
		@InjectConnection() private readonly connection: Connection,
		private readonly categoryService: CategoryService
	) { }

	async handleFile(file, target) {
		switch (target) {
			case 'contents':
				return await this.importContents(file);
			case 'organizations':
				return await this.importOrganizations(file);
			default:
				break;
		}
	}

	async importContents(file) {
		const res = await ExcelHelper.loadFromBuffer(file.data, Content.sheetsMap);

		Object.keys(res).forEach(async (key) => {
			const category = await this.categoryService.findOneByName(key);

			if (!category) return false;

			const news = Content.create(res[key]) as Content[];
			const list = news.map((item) => {
				item.category = category;
				return item;
			});

			await this.connection.getRepository(Content).save(list);
		});

		return true;
	}

	async importOrganizations(file) {
		const res = await ExcelHelper.loadFromBuffer(file.data, Organization.sheetsMap);
		const organizations = res['organizations'];
		const organizationArr = [];

		organizations.forEach((item) => {
			if (!!item.parent) {
				item.parent = organizationArr.find((org) => org.id === item.parent);
			}
			organizationArr.push(Organization.create(item));
		});

		await this.connection.getTreeRepository(Organization).save(organizationArr);

		return true;
	}
}
