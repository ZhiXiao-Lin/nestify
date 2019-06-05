import { RedisService } from 'nestjs-redis';
import { Redis } from 'ioredis';
import * as svgCaptcha from 'svg-captcha';
import { Controller, Req, Res, Param, Query, Get, Post, Body, Session } from '@nestjs/common';
import { CommonService } from '../../common/services/common.service';
import { ContentService } from '../../common/services/content.service';

@Controller()

export class IndexController {

	redisClient: Redis;

	constructor(
		private readonly commonService: CommonService,
		private readonly contentService: ContentService,
		private readonly redisService: RedisService
	) {
		this.redisClient = this.redisService.getClient();
	}

	@Get()
	async index(@Req() req, @Res() res, @Param() params, @Query() query) {
		const siteInfo = await this.commonService.getSiteInfo();

		const activity_list = await this.contentService.query({
			category: '精彩活动',
			pageSize: 5
		});

		const news_list = await this.contentService.query({
			category: '新闻动态',
			pageSize: 5
		});

		const notice_list = await this.contentService.query({
			category: '官方公告',
			pageSize: 3
		});

		const scenic_list = await this.contentService.query({
			category: '景点一览',
			pageSize: 4
		});

		const characteristic_list = await this.contentService.query({
			category: '工艺特色',
			pageSize: 10
		});

		const video_list = await this.contentService.query({
			category: '视频赏析',
			pageSize: 1
		});

		return res.render('/', {
			siteInfo,
			news_list,
			activity_list,
			notice_list,
			scenic_list,
			characteristic_list,
			video_list
		});
	}

	@Get('content/id/:id')
	async contentId(@Req() req, @Res() res, @Param() params, @Query() query) {
		const { id } = params;
		const siteInfo = await this.commonService.getSiteInfo();
		const content_body = await this.contentService.findOneById(id);

		console.log(content_body);

		return res.render('/intro', {
			type: 'content',
			siteInfo,
			html: content_body.text
		});
	}

	@Get('content/:category')
	async content(@Req() req, @Res() res, @Param() params, @Query() query) {
		// /content/introduction
		// /content/geo_profile
		// /content/culture
		// /content/development
		// /content/instructions


		const result = await this.contentService.query({ category: '景区介绍', page: 0, pageSize: 10 });

		console.log('【！！！】', result);


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

	@Get('getSVGCode')
	async getSVGCode(@Req() req, @Res() res, @Body() body, @Param() params, @Query() query) {
		const svg_obj = await this.commonService.getSVGCode();
		return res.send(svg_obj);
	}

	@Post('checkSVGCode')
	async checkSVGCode(@Req() req, @Res() res, @Body() body, @Param() params, @Query() query) {
		const { svg_hash, svg_text } = body;
		const result = await this.commonService.checkSVGCode(svg_hash, svg_text);
		
		return res.send({
			result
		});
	}




	@Get('error')
	async error() {
		throw new Error('服务器错误');
	}
}
