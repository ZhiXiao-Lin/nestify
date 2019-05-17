import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from './base.service';
import { Content } from '../entities/content.entity';

@Injectable()
export class ContentService extends BaseService<Content> {
	constructor(@InjectRepository(Content) private readonly contentRepository: Repository<Content>) {
		super(contentRepository);
	}

	async query(payload: any) {
		const qb = this.contentRepository.createQueryBuilder('t');

		if (!!payload.category) {
			qb.innerJoinAndSelect('t.category', 'category', 'category.name = :category', {
				category: payload.category
			});
		}

		qb.skip(payload.page * payload.pageSize);
		qb.take(payload.pageSize);

		return qb.getManyAndCount();
	}
}
