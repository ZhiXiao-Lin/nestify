import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from './base.service';
import { Category } from '../entities/category.entity';

@Injectable()
export class CategoryService extends BaseService<Category> {
	constructor(@InjectRepository(Category) private readonly categoryRepository: Repository<Category>) {
		super(categoryRepository);
	}

	async findOneByName(name: string) {
		return await this.categoryRepository.findOne({ name });
	}
}
