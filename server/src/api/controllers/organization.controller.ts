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
import { OrganizationService } from '../../common/services/organization.service';

@Api('organization')
@ApiUseTags('organization')
@ApiBearerAuth()
@UseGuards(AuthGuard())
@UseInterceptors(ClassSerializerInterceptor)
export class OrganizationController {
	constructor(private readonly organizationService: OrganizationService) { }

	@Get(':id')
	async findOne(@Param('id') id) {
		if (!id) throw new BadRequestException('参数 id 错误');

		return await this.organizationService.findOneById(id);
	}

	@Get('list')
	async list(@Query() payload) {
		return await this.organizationService.query(payload);
	}

	@Post()
	async create(@Body() dto: any) {
		return await this.organizationService.save(dto);
	}

	@Put()
	async update(@Body() dto: any) {
		return await this.organizationService.save(dto);
	}

	@Put('parent')
	async parent(@Body() dto: any) {
		return await this.organizationService.parent(dto);
	}

	@Delete()
	async remove(@Query() payload) {
		return await this.organizationService.remove(payload.selectedRows.split(','));
	}
}
