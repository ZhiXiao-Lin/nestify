import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Setting } from '../entities/setting.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class SettingService {
	constructor(@InjectRepository(Setting) private readonly settingRepository: Repository<Setting>) {}

	async getSettingByToken(token: string = 'default') {
		return await this.settingRepository.findOne({ token });
	}
}
