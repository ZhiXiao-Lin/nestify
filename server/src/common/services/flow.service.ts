import * as _ from 'lodash';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from './base.service';
import { Flow } from '../entities/flow.entity';
import { WFStatus, WFResult, Engine, wf } from '../lib/wf';
import { FlowTemplate } from '../entities/flow-template.entity';
import { FlowTemplateEnum } from '../aspects/enum';
import { TransformClassToPlain } from 'class-transformer';
import { User } from '../entities/user.entity';

@Injectable()
export class FlowService extends BaseService<Flow> {
    constructor(
        @InjectRepository(Flow) private readonly flowRepository: Repository<Flow>,
        @InjectRepository(FlowTemplate)
        private readonly flowTemplateRepository: Repository<FlowTemplate>
    ) {
        super(flowRepository);
    }

    async create(user: User, payload: any, template: FlowTemplateEnum, initState?: string) {
        const flow = new Flow();

        flow.state = initState || Object.keys(Engine.flowTemplates[template])[0];

        flow.wfStatus = WFStatus.RUNNING;
        flow.wfResult = WFResult.RUNNING;

        flow.template = await this.flowTemplateRepository.findOne({ where: { template } });
        flow.user = user;
        flow.ex_info = payload;

        if (!!payload.id) {
            flow.target = payload.id;
        }

        return await this.flowRepository.save(flow);
    }

    async dispatch(payload: any) {
        const { flow, action, options } = payload;

        return wf.dispatch(flow.id, action, options);
    }

    @TransformClassToPlain()
    async query(payload: any) {
        const qb = this.flowRepository.createQueryBuilder('t');

        qb.leftJoinAndSelect('t.template', 'template');
        qb.leftJoinAndSelect('t.user', 'user');
        qb.leftJoinAndSelect('t.operator', 'operator');
        qb.leftJoinAndSelect('t.executor', 'executor');

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
            qb.addOrderBy('t.create_at', 'DESC');
        }

        qb.skip(payload.page * payload.pageSize);
        qb.take(payload.pageSize);

        return await qb.getManyAndCount();
    }

    @TransformClassToPlain()
    async findAll() {
        const qb = this.flowRepository.createQueryBuilder('t');

        qb.leftJoinAndSelect('t.template', 'template');
        qb.leftJoinAndSelect('t.user', 'user');
        qb.leftJoinAndSelect('t.operator', 'operator');

        qb.where('t.wfResult =:wfResult', { wfResult: WFResult.RUNNING });

        return await qb.getMany();
    }

    async findOneById(id) {
        const target = await this.flowRepository.findOne({
            where: { id },
            relations: ['user', 'template', 'operator']
        });

        return target;
    }

    async findOneByUser(user: User, template: FlowTemplateEnum) {
        return this.flowRepository
            .createQueryBuilder('t')
            .leftJoinAndSelect('t.template', 'template')
            .leftJoinAndSelect('t.user', 'user')
            .leftJoinAndSelect('t.operator', 'operator')
            .where('user.id =:userId', { userId: user.id })
            .andWhere('template.template =:template', { template })
            .andWhere('t.wfResult =:wfResult', { wfResult: WFResult.RUNNING })
            .getOne();
    }

    async save(payload: any) {
        const target = Flow.create(payload) as Flow;

        return await this.flowRepository.save(target);
    }
}
