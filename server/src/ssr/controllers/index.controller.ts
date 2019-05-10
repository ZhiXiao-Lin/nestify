import { Controller, Get, Res } from '@nestjs/common';
import { CommonService } from '../../common/services/common.service';

@Controller()
export class IndexController {
	constructor(private readonly commonService: CommonService) {}

	@Get()
	async index(@Res() res) {
		const siteInfo = await this.commonService.getSiteInfo();

		return res.render('/', { siteInfo });
	}

	@Get('test')
	async test(@Res() res) {
		console.log('test');

		return 'test';
	}

	@Get('error')
	async error() {
		throw new Error('服务器错误');
	}
}
