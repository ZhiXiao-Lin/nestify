import * as _ from 'lodash';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from './base.service';
import { Content } from '../entities/content.entity';
import { CategoryService } from './category.service';

@Injectable()
export class ContentService extends BaseService<Content> {
	constructor(
		private readonly categoryService: CategoryService,
		@InjectRepository(Content) private readonly contentRepository: Repository<Content>
	) {
		super(contentRepository);
	}

	async query(payload: any) {
		const qb = this.contentRepository.createQueryBuilder('t');

		if (!!payload.category) {
			qb.innerJoinAndSelect('t.category', 'category', 'category.name = :category', {
				category: payload.category
			});
		}

		if (!payload.sortInfo) {
			qb.orderBy('t.sort', 'DESC');
			qb.addOrderBy('t.publish_at', 'DESC');
		}

		qb.skip(payload.page * payload.pageSize);
		qb.take(payload.pageSize);

		return qb.getManyAndCount();
	}

	async update(payload: any) {
		const content = Content.create(payload) as Content;

		if (!_.isEmpty(content.category) && _.isString(content.category)) {
			content.category = await this.categoryService.findOneByName(content.category);
		}

		return await this.contentRepository.save(content);
	}
}
