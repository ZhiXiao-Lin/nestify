import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Setting } from '../entities/setting.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SettingService {
	constructor(@InjectRepository(Setting) private readonly settingRepository: Repository<Setting>) {}

	async getSettingByToken(token: string = 'default') {
		return await this.settingRepository.findOne({ where: { token } });
	}
}
