import * as crypto from 'crypto';
import * as svgCaptcha from 'svg-captcha';
import { Redis } from 'ioredis';
import { RedisService } from 'nestjs-redis';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from '../entities/category.entity';
import { TreeRepository } from 'typeorm';
import { SettingService } from './setting.service';

@Injectable()
export class CommonService {
	redisClient: Redis;
	constructor(
		private readonly settingService: SettingService,
		private readonly redisService: RedisService,
		@InjectRepository(Category) private readonly categoryRepository: TreeRepository<Category>
	) {
		this.redisClient = this.redisService.getClient();
	}

	async getSiteInfo() {
		const menus = await this.categoryRepository.findTrees();
		const setting = await this.settingService.getSettingByToken();
		return {
			menus,
			...setting.ex_info
		};
	}

	async getSVGCode() {
		const { text, data } = svgCaptcha.create({
			size: 4, // 验证码长度
			ignoreChars: '0oO1I1k', // 验证码字符中排除 0o1i
			noise: 4, // 干扰线条的数量
			color: true, // 验证码的字符是否有颜色，默认没有，如果设定了背景，则默认有
			background: '#cc9966' // 验证码图片背景颜色
		});
		const svg_hash = crypto.createHash('md5').update(data).digest('hex');
		
		this.redisClient.set(
			svg_hash,
			text,
			'EX',
			60*2
		);
		return {
			svg_hash,
			svg_code: data
		};
	}

	async checkSVGCode(svg_hash: string, svg_text: string) {
		const svg_text_in_redis = await this.redisClient.get(svg_hash);

		if (svg_text_in_redis && svg_text_in_redis.toUpperCase() === svg_text.toUpperCase()) {
			return true;
		} else {
			return false;
		}
	}
}
