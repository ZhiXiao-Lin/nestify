import { Injectable } from '@nestjs/common';
import { ExcelHelper } from '../lib/excel';
import { Content } from '../entities/content.entity';
import { Organization } from '../entities/organization.entity';
import { CategoryService } from './category.service';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { Logger } from '../lib/logger';
import { StorageType } from '../aspects/enum';


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
			const parentCategory = await this.categoryService.findOneByName(key);
			if (!parentCategory) return false;

			Logger.log('Import parent category', parentCategory);

			res[key].map(async item => {

				item = Content.create(item) as Content;

				if (!!item.category) {
					item.category = await this.categoryService.findOneByName(item.category, parentCategory);
				} else {
					item.category = parentCategory;
				}

				if (!!item.thumbnail) {
					item.thumbnail = { storageType: StorageType.LOCAL, path: item.thumbnail };
				}

				await this.connection.getRepository(Content).save(item);
			});

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
