import * as _ from 'lodash';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransformClassToPlain } from 'class-transformer';
import { BaseService } from './base.service';
import { Service } from '../entities/service.entity';
import { ServiceCategory } from '../entities/service-category.entity';

@Injectable()
export class ServiceService extends BaseService<Service> {
    constructor(
        @InjectRepository(Service) private readonly serviceRepository: Repository<Service>,
        @InjectRepository(ServiceCategory)
        private readonly categoryRepository: Repository<ServiceCategory>
    ) {
        super(serviceRepository);
    }

    @TransformClassToPlain()
    async query(payload: any) {
        const qb = this.serviceRepository.createQueryBuilder('t');

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
        return await this.serviceRepository.findOne({
            where: { id },
            relations: ['category']
        });
    }

    async save(payload: any) {
        const target = Service.create(payload) as Service;

        return await this.serviceRepository.save(target);
    }
}
