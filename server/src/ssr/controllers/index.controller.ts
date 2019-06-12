import { RedisService } from 'nestjs-redis';
import { Redis } from 'ioredis';
import * as _ from 'lodash';
import { Controller, Req, Res, Param, Query, Get, Post, Body } from '@nestjs/common';
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

        return res.render('/', {
            siteInfo
        });
    }
}
