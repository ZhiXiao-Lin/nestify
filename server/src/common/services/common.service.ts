import { Injectable } from '@nestjs/common';
import { SettingService } from './setting.service';
import { CategoryService } from './category.service';

@Injectable()
export class CommonService {
	constructor(private readonly settingService: SettingService, private readonly categoryService: CategoryService) {}

	async getSiteInfo() {
		const menus = await this.categoryService.getMenus();
		const setting = await this.settingService.getSettingByToken();

		return {
			menus,
			setting: setting.ex_info
		};
	}
}
