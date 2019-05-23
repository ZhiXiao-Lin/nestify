import { Controller, Req, Res, Param, Query, Get, Post } from '@nestjs/common';
import { CommonService } from '../../common/services/common.service';

@Controller()
export class IndexController {
	constructor(private readonly commonService: CommonService) {}

	@Get()
	async index(@Req() req, @Res() res, @Param() params, @Query() query) {
		const siteInfo = await this.commonService.getSiteInfo();

		return res.render('/', { siteInfo });
	}

	@Get('introduction')
	async introduction(@Req() req, @Res() res, @Param() params, @Query() query) {
		const siteInfo = await this.commonService.getSiteInfo();

		return res.render('/introduction', { siteInfo });
	}

	@Get('characteristic')
	async characteristic(@Req() req, @Res() res, @Param() params, @Query() query) {
		const siteInfo = await this.commonService.getSiteInfo();

		return res.render('/characteristic', { siteInfo });
	}

	@Get('video/:id')
	async video(@Req() req, @Res() res, @Param() params, @Query() query) {
		const siteInfo = await this.commonService.getSiteInfo();

		return res.render('/video', { siteInfo });
	}

	@Get('crafts')
	async crafts(@Req() req, @Res() res, @Param() params, @Query() query) {
		const siteInfo = await this.commonService.getSiteInfo();

		return res.render('/crafts', { siteInfo });
	}


	@Get('instructions/:id')
	async instructions(@Req() req, @Res() res, @Param() params, @Query() query) {
		const siteInfo = await this.commonService.getSiteInfo();

		return res.render('/instructions', { siteInfo });
	}

	@Get('scenery')
	async scenery(@Req() req, @Res() res, @Param() params, @Query() query) {
		const siteInfo = await this.commonService.getSiteInfo();

		return res.render('/scenery', { siteInfo });
	}
	
	
	@Get('announcement')
	async announcement(@Req() req, @Res() res, @Param() params, @Query() query) {
		const siteInfo = await this.commonService.getSiteInfo();

		return res.render('/announcement', { siteInfo });
	}

	@Get('error')
	async error() {
		throw new Error('服务器错误');
	}
}
