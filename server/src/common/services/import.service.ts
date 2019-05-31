import { Injectable } from '@nestjs/common';
import { ExcelHelper } from '../lib/excel';
import { Content } from '../entities/content.entity';
import { CategoryService } from './category.service';
import { InjectRepository, InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Injectable()
export class ImportService {
	constructor(
		@InjectConnection() private readonly connection: Connection,
		private readonly categoryService: CategoryService
	) { }

	async handleFile(file, target) {
		switch (target) {
			case 'news':
				return await this.importNews(file);
			default:
				break;
		}
	}

	async importNews(file) {
		const res = await ExcelHelper.loadFromBuffer(file.data, Content.sheetsMap);

		console.log(res);

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
}
