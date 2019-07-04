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
import { Logger } from '../lib/logger';

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

        flow.state = initState || Engine.flowTemplates[template][0]['name'];

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

        return wf.dispatch(_.isString(flow) ? flow : flow.id, action, options);
    }

    async authCheck(data: any, user: User) {
        let [list, count] = data;

        if (!user.isSuperAdmin) {
            list = list.map(item => {

                const flowStep = item.template.ex_info.flowSteps.find(flow => flow.name === item.state);

                item.ExecutableTasks = item.ExecutableTasks.filter(task => {

                    const step = flowStep.steps.find(step => step.name === task);

                    Logger.log('---> task', task);
                    Logger.log('---> step', step);

                    let state = false;

                    if (!!step.roles) {
                        state = step.roles.includes(user.role.token);
                        Logger.log('---> check roles', state);

                        const checkSelf = step.roles.find(role => role === 'self');
                        if (!!checkSelf) {
                            state = (item.user.id === user.id);
                            Logger.log('---> check self', state);
                        }

                        const checkExecutor = step.roles.find(role => role === 'executor');
                        if (!!checkExecutor) {
                            state = (item.executor.id === user.id);
                            Logger.log('---> check executor', state);
                        }

                    }

                    return state;
                });
                return item;
            });
        }

        return [list, count];
    }

    async query(payload: any, user: User) {
        return await this.authCheck(await this.list(payload), user);
    }

    async requirement(payload: any, user: User) {

        payload.template = FlowTemplateEnum.WORK_OR;

        return await this.authCheck(await this.list(payload), user);
    }

    async task(payload: any, user: User) {

        payload.template = FlowTemplateEnum.WORK_OR;

        return await this.authCheck(await this.list(payload), user);
    }

    @TransformClassToPlain()
    async list(payload: any) {
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

        if (!!payload.userId) {
            qb.andWhere('user.id =:id', { id: payload.userId });
        }

        if (!!payload.executorId) {
            qb.andWhere('executor.id =:id', { id: payload.executorId });
        }

        if (!!payload.template) {
            qb.andWhere('template.template =:template', { template: payload.template });
        }

        if (!!payload.keyword) {
            qb.andWhere(`t.name LIKE '%${payload.keyword}%'`);
        }

        if (!!payload.state) {
            qb.andWhere('t.state =:state', { state: payload.state });
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
