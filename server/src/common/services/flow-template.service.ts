import * as _ from 'lodash';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from './base.service';
import { FlowTemplate } from '../entities/flow-template.entity';

@Injectable()
export class FlowTemplateService extends BaseService<FlowTemplate> {
    constructor(
        @InjectRepository(FlowTemplate)
        private readonly flowTemplateRepository: Repository<FlowTemplate>
    ) {
        super(flowTemplateRepository);
    }

    async query(payload: any) {
        const qb = this.flowTemplateRepository.createQueryBuilder('t');

        if (!payload.page) {
            payload.page = 0;
        }

        if (!payload.pageSize) {
            payload.pageSize = 10;
        }

        if (!!payload.keyword) {
            qb.andWhere(`t.name LIKE '%${payload.keyword}%'`);
        }

        if (!!payload.sort && !!payload.order) {
            qb.addOrderBy(`t.${payload.sort}`, payload.order);
        } else {
            qb.addOrderBy('t.update_at', 'DESC');
        }

        qb.skip(payload.page * payload.pageSize);
        qb.take(payload.pageSize);

        return await qb.getManyAndCount();
    }

    async findOneById(id) {
        return await this.flowTemplateRepository.findOne(id);
    }

    async save(payload: any) {
        const target = FlowTemplate.create(payload) as FlowTemplate;

        return await this.flowTemplateRepository.save(target);
    }
}
