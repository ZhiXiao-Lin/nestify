import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { RowStatus } from '../aspects/enum';

@Injectable()
export class CategoryService {
	constructor(@InjectRepository(Category) private readonly categoryRepository: TreeRepository<Category>) {}

	async getMenus() {
		return await this.categoryRepository.findTrees();
	}
}
