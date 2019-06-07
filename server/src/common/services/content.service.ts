import * as _ from 'lodash';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransformClassToPlain } from 'class-transformer';
import { BaseService } from './base.service';
import { Content } from '../entities/content.entity';
import { CategoryService } from './category.service';
import { ExcelHelper } from '../lib/excel';

@Injectable()
export class ContentService extends BaseService<Content> {
    constructor(
        private readonly categoryService: CategoryService,
        @InjectRepository(Content) private readonly contentRepository: Repository<Content>
    ) {
        super(contentRepository);
    }

    @TransformClassToPlain()
    async query(payload: any) {
        const qb = this.contentRepository.createQueryBuilder('t');

        if (!payload.page) {
            payload.page = 0;
        }

        if (!payload.pageSize) {
            payload.pageSize = 10;
        }

        if (!!payload.category) {
            qb.innerJoinAndSelect('t.category', 'category', 'category.name = :category', {
                category: payload.category
            });
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

            const dataSource = await qb.getMany();

            // 执行导出逻辑
            return await ExcelHelper.export(
                dataSource,
                Content.sheetsMap[payload.category],
                payload.fields.split(',')
            );
        } else {
            qb.skip(payload.page * payload.pageSize);
            qb.take(payload.pageSize);
        }

        return await qb.getManyAndCount();
    }

    @TransformClassToPlain()
    async findOneAndParents(id: string) {
        const content = await this.contentRepository.findOne({
            where: { id },
            relations: ['category']
        });

        const parents = await this.categoryService.findParentsTree(content.category);

        return { content, parents };
    }

    async save(payload: any) {
        const content = Content.create(payload) as Content;

        if (!_.isEmpty(content.category) && _.isString(content.category)) {
            content.category = await this.categoryService.findOneByName(content.category);
        }

        return await this.contentRepository.save(content);
    }
}
