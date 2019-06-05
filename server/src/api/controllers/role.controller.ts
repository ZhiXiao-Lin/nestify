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
import { Api } from '../../common/aspects/decorator';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { RoleService } from '../../common/services/role.service';

@Api('role')
@ApiUseTags('role')
@ApiBearerAuth()
@UseGuards(AuthGuard())
@UseInterceptors(ClassSerializerInterceptor)
export class RoleController {
	constructor(private readonly roleService: RoleService) { }

	@Get(':id')
	async findOne(@Param('id') id) {
		if (!id) throw new BadRequestException('参数 id 错误');

		return await this.roleService.findOneAndRelations(id);
	}

	@Get('list')
	async list(@Query() payload) {
		return await this.roleService.query(payload);
	}

	@Get('export')
	async export(@Query() payload) {
		return await this.roleService.query(payload);
	}

	@Post()
	async create(@Body() dto: any) {
		return await this.roleService.save(dto);
	}

	@Put()
	async update(@Body() dto: any) {
		return await this.roleService.save(dto);
	}

	@Delete()
	async remove(@Query() payload) {
		return await this.roleService.remove(payload.selectedRows.split(','));
	}
}
