import * as _ from 'lodash';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransformClassToPlain } from 'class-transformer';
import { BaseService } from './base.service';
import { Role } from '../entities/role.entity';

@Injectable()
export class RoleService extends BaseService<Role> {
    constructor(@InjectRepository(Role) private readonly roleRepository: Repository<Role>) {
        super(roleRepository);
    }

    @TransformClassToPlain()
    async findOneAndRelations(id: string) {
        return await this.roleRepository.findOne({ where: { id }, relations: ['authorities'] });
    }

    @TransformClassToPlain()
    async query(payload: any) {
        const qb = this.roleRepository.createQueryBuilder('t');

        qb.leftJoinAndSelect('t.authorities', 'authorities');

        if (!!payload.keyword) {
            qb.andWhere(`t.name LIKE '%${payload.keyword}%'`);
        }

        if (!!payload.sort && !!payload.order) {
            qb.addOrderBy(`t.${payload.sort}`, payload.order);
        } else {
            // 默认排序规则
            qb.addOrderBy('t.sort', 'DESC');
        }

        qb.skip(payload.page * payload.pageSize);
        qb.take(payload.pageSize);

        return await qb.getManyAndCount();
    }

    async save(payload: any) {
        const role = Role.create(payload) as Role;

        return await this.roleRepository.save(role);
    }
}
