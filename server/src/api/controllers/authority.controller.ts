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
import { AuthorityService } from '../../common/services/authority.service';

@Api('authority')
@ApiUseTags('authority')
@ApiBearerAuth()
@UseGuards(AuthGuard())
@UseInterceptors(ClassSerializerInterceptor)
export class AuthorityController {
	constructor(private readonly authorityService: AuthorityService) { }

	@Get(':id')
	async findOne(@Param('id') id) {
		if (!id) throw new BadRequestException('参数 id 错误');

		return await this.authorityService.findOneById(id);
	}

	@Get('list')
	async list(@Query() payload) {
		return await this.authorityService.query(payload);
	}

	@Post()
	async create(@Body() dto: any) {
		return await this.authorityService.save(dto);
	}

	@Put()
	async update(@Body() dto: any) {
		return await this.authorityService.save(dto);
	}

	@Put('parent')
	async parent(@Body() dto: any) {
		return await this.authorityService.parent(dto);
	}

	@Delete()
	async remove(@Query() payload) {
		return await this.authorityService.remove(payload.selectedRows.split(','));
	}
}
