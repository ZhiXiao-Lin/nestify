import * as _ from 'lodash';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';
import { BaseService } from './base.service';
import { Category } from '../entities/category.entity';

@Injectable()
export class CategoryService extends BaseService<Category> {
	constructor(@InjectRepository(Category) private readonly categoryRepository: TreeRepository<Category>) {
		super(categoryRepository);
	}

	async query(payload: any) {

		return await this.categoryRepository.findTrees();
	}

	async findOneByName(name: string, parent: Category = null) {
		const condition: any = { where: { name } };

		if (!!parent) {
			condition.where.parent = parent.id;
		}

		return await this.categoryRepository.findOne(condition);
	}

	async findParentsTree(category: Category) {
		return await this.categoryRepository.findAncestorsTree(category);
	}

	async save(payload: any) {
		const target = Category.create(payload) as Category;

		if (!!payload.parentId) {
			target.parent = await this.categoryRepository.findOne(payload.parentId);
		}

		return await this.categoryRepository.save(target);
	}
}
