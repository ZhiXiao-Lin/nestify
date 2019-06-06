import { RedisService } from 'nestjs-redis';
import { Redis } from 'ioredis';
import * as _ from 'lodash';
import { Controller, Req, Res, Param, Query, Get, Post, Body, Session } from '@nestjs/common';
import { CommonService } from '../../common/services/common.service';
import { ContentService } from '../../common/services/content.service';

const toGetMenuIndex = (menus, asPath) => {
	let path = asPath.split('?').shift().split('/').pop();
	let index = 0;
	let order = 0;
	menus.forEach((menu, i) => {
		if (menu.children && menu.children.length > 0) {
			menu.children.forEach((item, j) => {
				if (path === item.url.split('/').pop()) {
					index = i;
					order = j;
				}
			})
		}
	});
	return {
		menu_show: menus[index],
		order
	};
}

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
		const { content, parents } = await this.contentService.findOneAndParents(id);

		return res.render('/intro', {
			type: 'content',
			siteInfo,
			content,
			parents
		});
	}

	@Get('content/:category')
	async content(@Req() req, @Res() res, @Param() params, @Query() query) {
		// /content/introduction
		// /content/geo_profile
		// /content/culture
		// /content/development
		// /content/instructions

		const { url } = req.raw;
		const siteInfo = await this.commonService.getSiteInfo();
		const { menu_show, order } = toGetMenuIndex(siteInfo.menus, url);
		const result = await this.contentService.query({ category: menu_show.children[order].name, page: 0, pageSize: 1 });

		return res.render('/intro', {
			type: 'content',
			siteInfo,
			content: result[0] ? result[0][0] : {}
		});
	}

	@Get('list/:category')
	async list(@Req() req, @Res() res, @Param() params, @Query() query) {
		// /list/scenery
		// /list/activities
		// /list/news

		const { page } = query;
		const { url } = req.raw;
		const siteInfo = await this.commonService.getSiteInfo();
		const { menu_show, order } = toGetMenuIndex(siteInfo.menus, url);
		const result = await this.contentService.query({ category: menu_show.children[order].name, page: page ? Number(page) : 0 });

		return res.render('/intro', {
			type: 'list',
			siteInfo,
			list: result
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
		const { page } = query;
		const { url } = req.raw;
		const siteInfo = await this.commonService.getSiteInfo();

		if (id) {
			const { content, parents } = await this.contentService.findOneAndParents(id);

			return res.render('/intro', {
				type: 'imageDetail',
				siteInfo,
				content,
				parents
			});
		} else {
			const { menu_show, order } = toGetMenuIndex(siteInfo.menus, url);
			const result = await this.contentService.query({ category: menu_show.children[order].name, page: page ? Number(page) : 0, pageSize: 12 });
			
			return res.render('/intro', {
				type: 'image',
				siteInfo,
				list: result
			});
		}
	}

	@Get('video/:category')
	async video(@Req() req, @Res() res, @Param() params, @Query() query) {
		// /video/characteristic
		// /video/show

		const { id } = query;
		const { page } = query;
		const { url } = req.raw;
		const siteInfo = await this.commonService.getSiteInfo();

		if (id) {
			const { content, parents } = await this.contentService.findOneAndParents(id);

			return res.render('/intro', {
				type: 'videoDetail',
				siteInfo,
				content,
				parents
			});
		} else {
			const { menu_show, order } = toGetMenuIndex(siteInfo.menus, url);
			const result = await this.contentService.query({ category: menu_show.children[order].name, page: page ? Number(page) : 0, pageSize: 12 });

			return res.render('/intro', {
				type: 'video',
				siteInfo,
				list: result
			});
		}
	}

	@Get('announcement')
	async announcement(@Req() req, @Res() res, @Param() params, @Query() query) {
		const { page } = query;
		const siteInfo = await this.commonService.getSiteInfo();
		const result = await this.contentService.query({ category: '官方公告', page: page ? Number(page) : 0, pageSize: 20 });

		return res.render('/announcement', {
			siteInfo,
			list: result
		});
	}

	@Get('concact')
	async concact(@Req() req, @Res() res, @Param() params, @Query() query) {
		const siteInfo = await this.commonService.getSiteInfo();
		const result = await this.contentService.query({ category: '联系方式', pageSize: 1000 });

		return res.render('/concact', {
			siteInfo,
			list: result
		});
	}

	@Get('message')
	async message(@Req() req, @Res() res, @Param() params, @Query() query) {
		const { page } = query;
		const siteInfo = await this.commonService.getSiteInfo();
		const result = await this.contentService.query({ category: '留言咨询', page: page ? Number(page) : 0, pageSize: 10 });

		return res.render('/message', {
			siteInfo,
			list: result
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

	@Post('saveSuggesstion')
	async saveSuggesstion(@Req() req, @Res() res, @Body() body, @Param() params, @Query() query) {
		body.question = body.title;
		delete body.title;
		const result = await this.contentService.save({
			category: '留言咨询',
			ex_info: body
		});
		if (result) {
			res.send({ result: true });
		} else {
			res.send({ result: false });
		}
		
	}


	@Get('error')
	async error() {
		throw new Error('服务器错误');
	}
}
