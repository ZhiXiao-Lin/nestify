import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Setting } from '../entities/setting.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from './base.service';

@Injectable()
export class SettingService extends BaseService<Setting> {
    constructor(
        @InjectRepository(Setting) private readonly settingRepository: Repository<Setting>
    ) {
        super(settingRepository);
    }

    async getSettingByToken(token: string = 'default') {
        return await this.settingRepository.findOne({ token });
    }

    async save(payload: any) {
        const target = Setting.create(payload) as Setting;
        return await this.settingRepository.save(target);
    }
}
