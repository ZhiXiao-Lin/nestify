import * as _ from 'lodash';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransformClassToPlain } from 'class-transformer';
import { BaseService } from './base.service';
import { Role } from '../entities/role.entity';
import { OrganizationService } from './organization.service';


@Injectable()
export class RoleService extends BaseService<Role> {
	constructor(
		private readonly organizationService: OrganizationService,
		@InjectRepository(Role) private readonly roleRepository: Repository<Role>
	) {
		super(roleRepository);
	}

	async findOneAndRelations(id: string) {
		return await this.roleRepository.findOne({ where: { id }, relations: ['organization'] });
	}

	@TransformClassToPlain()
	async query(payload: any) {
		const qb = this.roleRepository.createQueryBuilder('t');

		if (!!payload.organization) {
			qb.innerJoinAndSelect('t.organization', 'organization', 'organization.id = :organization', {
				organization: payload.organization
			});
		}

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

		if (!_.isEmpty(payload.organization) && _.isString(payload.organization)) {
			role.organization = await this.organizationService.findOneById(payload.organization);
		}

		return await this.roleRepository.save(role);
	}
}
