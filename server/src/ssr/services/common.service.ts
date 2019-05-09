import { Injectable } from '@nestjs/common';
import { SettingService } from '../../common/services/setting.service';

@Injectable()
export class CommonService {
	constructor(private readonly settingService: SettingService) {}

	async getSiteInfo() {
		const setting = await this.settingService.getSettingByToken();

		return {
			setting: setting.ex_info
		};
	}
}
