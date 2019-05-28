import { Controller, Req, Res, Param, Query, Get, Post } from '@nestjs/common';
import { CommonService } from '../../common/services/common.service';

@Controller()
export class IndexController {
	constructor(private readonly commonService: CommonService) {}

	@Get()
	async index(@Req() req, @Res() res, @Param() params, @Query() query) {
		const siteInfo = await this.commonService.getSiteInfo();

		return res.render('/', { 
			siteInfo 
		});
	}

	@Get('content/:category')
	async content(@Req() req, @Res() res, @Param() params, @Query() query) {
		// /content/introduction
		// /content/geo_profile
		// /content/culture
		// /content/development
		// /content/instructions

		const { category } = query;
		const siteInfo = await this.commonService.getSiteInfo();

		return res.render('/intro', { 
			type: 'content',
			siteInfo 
		});
	}

	@Get('list/:category')
	async list(@Req() req, @Res() res, @Param() params, @Query() query) {
		// /list/scenery
		// /list/activities
		// /list/news

		const siteInfo = await this.commonService.getSiteInfo();

		return res.render('/intro', {
			type: 'list',
			siteInfo,
		});
	}

	@Get('image/:category')
	async image(@Req() req, @Res() res, @Param() params, @Query() query) {
		// /image/specialty
		// /image/crafts
		// /image/guide
		// /image/photo
		// /image/delicious
		// /image/hotel
		// /image/shopping
		// /image/entertainment
		// /image/trips
		// /image/travels

		const { id } = query;
		const siteInfo = await this.commonService.getSiteInfo();

		return res.render('/intro', {
			type: id ? 'imageDetail' : 'image',
			siteInfo 
		});
	}

	@Get('video/:category')
	async video(@Req() req, @Res() res, @Param() params, @Query() query) {
		// /video/characteristic
		// /video/show

		const { id } = query;
		const siteInfo = await this.commonService.getSiteInfo();

		return res.render('/intro', {
			type: id ? 'videoDetail' : 'video',
			siteInfo 
		});
	}




	@Get('announcement')
	async announcement(@Req() req, @Res() res, @Param() params, @Query() query) {
		const siteInfo = await this.commonService.getSiteInfo();

		return res.render('/announcement', { 
			siteInfo 
		});
	}

	@Get('concact')
	async concact(@Req() req, @Res() res, @Param() params, @Query() query) {
		const siteInfo = await this.commonService.getSiteInfo();

		return res.render('/concact', { 
			siteInfo 
		});
	}

	@Get('message')
	async message(@Req() req, @Res() res, @Param() params, @Query() query) {
		const siteInfo = await this.commonService.getSiteInfo();

		return res.render('/message', { 
			siteInfo 
		});
	}

	@Get('suggestions')
	async suggestions(@Req() req, @Res() res, @Param() params, @Query() query) {
		const siteInfo = await this.commonService.getSiteInfo();

		return res.render('/suggestions', { 
			siteInfo 
		});
	}






	@Get('error')
	async error() {
		throw new Error('服务器错误');
	}
}
