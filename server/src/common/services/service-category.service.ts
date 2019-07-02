import * as _ from 'lodash';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';
import { BaseService } from './base.service';
import { ServiceCategory } from '../entities/service-category.entity';

@Injectable()
export class ServiceCategoryService extends BaseService<ServiceCategory> {
    constructor(
        @InjectRepository(ServiceCategory)
        private readonly categoryRepository: TreeRepository<ServiceCategory>
    ) {
        super(categoryRepository);
    }

    async query(payload: any) {
        return await this.categoryRepository.findTrees();
    }

    async findOneByName(name: string, parent: ServiceCategory = null) {
        const condition: any = { where: { name } };

        if (!!parent) {
            condition.where.parent = parent.id;
        }

        return await this.categoryRepository.findOne(condition);
    }

    async findParentsTree(category: ServiceCategory) {
        return await this.categoryRepository.findAncestorsTree(category);
    }

    async findChildrenTree(name: string) {
        const parent = await this.categoryRepository.findOne({ where: { name } });

        return await this.categoryRepository.findDescendantsTree(parent);
    }

    async save(payload: any) {
        const target = ServiceCategory.create(payload) as ServiceCategory;

        if (!!payload.parentId) {
            target.parent = await this.categoryRepository.findOne(payload.parentId);
        }

        return await this.categoryRepository.save(target);
    }
}
