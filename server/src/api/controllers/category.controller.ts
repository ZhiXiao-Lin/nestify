import { ApiUseTags, ApiBearerAuth } from '@nestjs/swagger';
import {
	UseGuards,
	Get,
	Query,
	Delete,
	Param,
	BadRequestException,
	Post,
	Put,
	Body,
	UseInterceptors
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Api } from '../../common/aspects/decorator';
import { CategoryService } from '../../common/services/category.service';

@Api('category')
@ApiUseTags('category')
@ApiBearerAuth()
@UseGuards(AuthGuard())
@UseInterceptors(ClassSerializerInterceptor)
export class CategoryController {
	constructor(private readonly categoryService: CategoryService) { }

	@Get(':id')
	async findOne(@Param('id') id) {
		if (!id) throw new BadRequestException('参数 id 错误');

		return await this.categoryService.findOneById(id);
	}

	@Get('list')
	async list(@Query() payload) {
		return await this.categoryService.query(payload);
	}

	@Get(':parentId/children')
	async findByParent(@Param('parentId') parentId) {

		return await this.categoryService.findChildrenTree(parentId);
	}

	@Post()
	async create(@Body() dto: any) {
		return await this.categoryService.save(dto);
	}

	@Put()
	async update(@Body() dto: any) {
		return await this.categoryService.save(dto);
	}

	@Delete()
	async remove(@Query() payload) {
		return await this.categoryService.remove(payload.selectedRows.split(','));
	}
}
