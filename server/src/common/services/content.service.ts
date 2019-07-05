import * as _ from 'lodash';
import * as moment from 'moment';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransformClassToPlain } from 'class-transformer';
import { BaseService } from './base.service';
import { Content } from '../entities/content.entity';
import { Logger } from '../lib/logger';
import redis from '../lib/redis';

@Injectable()
export class ContentService extends BaseService<Content> {
    constructor(
        @InjectRepository(Content) private readonly contentRepository: Repository<Content>
    ) {
        super(contentRepository);
    }

    @TransformClassToPlain()
    async query(payload: any) {
        const qb = this.contentRepository.createQueryBuilder('t');

        qb.leftJoinAndSelect('t.category', 'category');

        if (!payload.page) {
            payload.page = 0;
        }

        if (!payload.pageSize) {
            payload.pageSize = 10;
        }

        if (!!payload.category) {
            qb.andWhere('category.id =:category', { category: payload.category });
        }

        if (!!payload.keyword) {
            qb.andWhere(`t.title LIKE '%${payload.keyword}%'`);
        }

        if (!!payload.publish_at) {
            payload.publish_at = payload.publish_at.split(',');
            qb.andWhere(
                `t.publish_at BETWEEN '${payload.publish_at.shift()}' AND '${payload.publish_at.pop()}'`
            );
        }

        if (!!payload.sort && !!payload.order) {
            qb.addOrderBy(`t.${payload.sort}`, payload.order);
        } else {
            // 默认排序规则
            qb.addOrderBy('t.sort', 'DESC');
            qb.addOrderBy('t.publish_at', 'DESC');
        }

        if (!!payload.isExport) {
            if (!payload.category) throw new BadRequestException('分类参数错误');

            return await qb.getMany();
        } else {
            qb.skip(payload.page * payload.pageSize);
            qb.take(payload.pageSize);
        }

        return await qb.getManyAndCount();
    }

    @TransformClassToPlain()
    async findOneById(id) {
        return await this.contentRepository.findOne({
            where: { id },
            relations: ['category']
        });
    }

    async updateViews(id: string, ip: string) {

        // 当前时间
        const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
        Logger.log('currentTime', currentTime);

        // 文章最后访问时间
        const lastTime = await redis.hget('content_lastTime', `${id}`);
        Logger.log('lastTime', lastTime);

        if (!!lastTime) {
            Logger.log('当前时间减去 5 分钟', moment(currentTime).subtract(5, 'minute').format('YYYY-MM-DD HH:mm:ss'));
            // 当前时间减去 5 分钟，是否在最后访问时间之后
            if (moment(currentTime).subtract(5, 'minute').isAfter(lastTime)) {
                // 将缓存中的访问量存入数据库
                Logger.log('将缓存中的访问量存入数据库');

                const views = await redis.hget('content_views', `${id}`);
                Logger.log('当前问量', views);

                await Promise.all([
                    this.contentRepository.increment({ id }, 'views', views || 0),
                    redis.hdel('content_views', `${id}`),
                    redis.hset('content_lastTime', `${id}`, currentTime)
                ]);
            }
        } else {
            await redis.hset('content_lastTime', `${id}`, currentTime);
        }

        // ip 最后访问时间
        const accessTime = await redis.hget('content_accessTime', `${id}${ip}`);
        Logger.log('accessTime', accessTime);

        if (!!accessTime) {
            Logger.log('当前时间减去 1 小时', moment(currentTime).subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'));
            // 当前时间减去 1 小时，是否在当前 ip 最后访问时间之后
            if (moment(currentTime).subtract(1, 'hour').isAfter(accessTime)) {
                Logger.log('在当前 ip 最后访问时间之后');

                await Promise.all([
                    redis.hset('content_accessTime', `${id}${ip}`, currentTime),
                    redis.hincrby('content_views', `${id}`, 1)
                ]);
            }
        } else {
            await redis.hset('content_accessTime', `${id}${ip}`, currentTime);
        }
    }

    async save(payload: any) {
        const target = Content.create(payload) as Content;

        return await this.contentRepository.save(target);
    }
}
