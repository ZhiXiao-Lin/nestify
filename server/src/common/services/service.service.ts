import * as _ from 'lodash';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransformClassToPlain } from 'class-transformer';
import { BaseService } from './base.service';
import { Service } from '../entities/service.entity';
import { FlowService } from './flow.service';
import wf from '../lib/wf';
import { FlowTemplateEnum } from '../aspects/enum';
import { User } from '../entities/user.entity';


@Injectable()
export class ServiceService extends BaseService<Service> {
    constructor(
        private readonly flowService: FlowService,
        @InjectRepository(Service) private readonly serviceRepository: Repository<Service>
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

        if (!!payload.sort && !!payload.order) {
            qb.addOrderBy(`t.${payload.sort}`, payload.order);
        } else {
            // 默认排序规则
            qb.addOrderBy('t.create_at', 'DESC');
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

    async apply(user: User, payload: any) {

        payload.service = await this.findOneById(payload.id);

        const flow = await this.flowService.create(user, payload, FlowTemplateEnum.WORK_OR);

        return wf.dispatch(flow.id, '申请');
    }
}
