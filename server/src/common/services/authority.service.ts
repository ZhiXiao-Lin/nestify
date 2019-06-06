import * as _ from 'lodash';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';
import { BaseService } from './base.service';
import { Authority } from '../entities/authority.entity';

@Injectable()
export class AuthorityService extends BaseService<Authority> {
	constructor(@InjectRepository(Authority) private readonly authorityRepository: TreeRepository<Authority>) {
		super(authorityRepository);
	}

	async query(payload: any) {

		return await this.authorityRepository.findTrees();
	}

	async findOneByName(name: string) {
		return await this.authorityRepository.findOne({ name });
	}

	async save(payload: any) {
		const target = Authority.create(payload) as Authority;

		if (!!payload.parentId) {
			target.parent = await this.authorityRepository.findOne(payload.parentId);
		}

		return await this.authorityRepository.save(target);
	}

	async parent(payload: any) {
		const target = await this.authorityRepository.findOne(payload.id);
		target.parent = await this.authorityRepository.findOne(payload.parentId);

		return await this.authorityRepository.save(target);
	}

	async remove(ids: string[]) {

		const roots = await this.authorityRepository.findRoots();

		// roots.forEach(root => {
		// 	if (ids.includes(root.id)) throw new BadRequestException('不能删除根节点');
		// });

		return await this.authorityRepository.delete(ids);
	}
}
