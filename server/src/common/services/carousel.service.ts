import * as _ from 'lodash';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from './base.service';
import { Carousel } from '../entities/carousel.entity';
import { TransformClassToPlain } from 'class-transformer';

@Injectable()
export class CarouselService extends BaseService<Carousel> {
    constructor(
        @InjectRepository(Carousel) private readonly carouselRepository: Repository<Carousel>
    ) {
        super(carouselRepository);
    }

    @TransformClassToPlain()
    async query(payload: any) {
        const qb = this.carouselRepository.createQueryBuilder('t');

        if (!payload.page) {
            payload.page = 0;
        }

        if (!payload.pageSize) {
            payload.pageSize = 10;
        }

        if (!!payload.keyword) {
            qb.andWhere(`t.token LIKE '%${payload.keyword}%'`);
        }

        if (!!payload.sort && !!payload.order) {
            qb.addOrderBy(`t.${payload.sort}`, payload.order);
        } else {
            qb.addOrderBy('t.update_at', 'DESC');
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
        return await this.carouselRepository.findOne({
            where: { id }
        });
    }

    @TransformClassToPlain()
    async findOneByToken(token) {
        return await this.carouselRepository.findOne({
            where: { token }
        });
    }

    async save(payload: any) {
        const target = Carousel.create(payload) as Carousel;

        return await this.carouselRepository.save(target);
    }
}
