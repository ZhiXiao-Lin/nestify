import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from './base.service';
import { Feedback } from '../entities/feedback.entity';

@Injectable()
export class FeedbackService extends BaseService<Feedback> {
    constructor(
        @InjectRepository(Feedback) private readonly feedbackRepository: Repository<Feedback>
    ) {
        super(feedbackRepository);
    }

    async query(payload: any) {
        const qb = this.feedbackRepository.createQueryBuilder('t');

        qb.leftJoinAndSelect('t.user', 'user');

        if (!payload.page) {
            payload.page = 0;
        }

        if (!payload.pageSize) {
            payload.pageSize = 10;
        }

        if (!!payload.keyword) {
            qb.andWhere(`t.title LIKE '%${payload.keyword}%'`);
        }

        if (!!payload.userId) {
            qb.andWhere('user.id = :userId', { userId: payload.userId });
        }

        if (!!payload.sort && !!payload.order) {
            qb.addOrderBy(`t.${payload.sort}`, payload.order);
        } else {
            qb.addOrderBy('t.create_at', 'DESC');
        }

        if (!!payload.isExport) {
            return await qb.getMany();
        } else {
            qb.skip(payload.page * payload.pageSize);
            qb.take(payload.pageSize);
        }

        return await qb.getManyAndCount();
    }

    async findOneById(id) {
        return await this.feedbackRepository.findOne({
            where: { id },
            relations: ['user']
        });
    }

    async save(payload: any) {
        const target = Feedback.create(payload) as Feedback;

        return await this.feedbackRepository.save(target);
    }
}
