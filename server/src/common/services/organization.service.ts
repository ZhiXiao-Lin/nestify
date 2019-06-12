import * as _ from 'lodash';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';
import { BaseService } from './base.service';
import { Organization } from '../entities/organization.entity';

@Injectable()
export class OrganizationService extends BaseService<Organization> {
    constructor(
        @InjectRepository(Organization)
        private readonly organizationRepository: TreeRepository<Organization>
    ) {
        super(organizationRepository);
    }

    async query(payload: any) {
        return await this.organizationRepository.findTrees();
    }

    async findOneByName(name: string) {
        return await this.organizationRepository.findOne({ name });
    }

    async save(payload: any) {
        const organization = Organization.create(payload) as Organization;

        if (!!payload.parentId) {
            organization.parent = await this.organizationRepository.findOne(payload.parentId);
        }

        return await this.organizationRepository.save(organization);
    }

    async parent(payload: any) {
        const target = await this.organizationRepository.findOne(payload.id);
        target.parent = await this.organizationRepository.findOne(payload.parentId);

        return await this.organizationRepository.save(target);
    }

    async remove(ids: string[]) {
        const roots = await this.organizationRepository.findRoots();

        roots.forEach((root) => {
            if (ids.includes(root.id)) throw new BadRequestException('不能删除根节点');
        });

        return await this.organizationRepository.remove(
            await this.organizationRepository.findByIds(ids)
        );
    }
}
