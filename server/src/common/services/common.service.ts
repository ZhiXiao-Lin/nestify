import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from '../entities/category.entity';
import { TreeRepository } from 'typeorm';
import { SettingService } from './setting.service';

@Injectable()
export class CommonService {
	constructor(
		private readonly settingService: SettingService,
		@InjectRepository(Category) private readonly categoryRepository: TreeRepository<Category>
	) {}

	async getSiteInfo() {
		const menus = await this.categoryRepository.findTrees();
		const setting = await this.settingService.getSettingByToken();
		return {
			menus,
			...setting.ex_info
		};
	}
}
