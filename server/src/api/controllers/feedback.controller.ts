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
import { Api, CurrentUser } from '../../common/aspects/decorator';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { FeedbackService } from '../../common/services/feedback.service';

@Api('feedback')
@ApiUseTags('feedback')
@ApiBearerAuth()
@UseGuards(AuthGuard())
@UseInterceptors(ClassSerializerInterceptor)
export class FeedbackController {
	constructor(private readonly feedbackService: FeedbackService) { }

	@Get(':id')
	async findOne(@Param('id') id) {
		if (!id) throw new BadRequestException('参数 id 错误');

		return await this.feedbackService.findOneById(id);
	}

	@Get('list')
	async list(@Query() payload) {
		return await this.feedbackService.query(payload);
	}

	@Get('export')
	async export(@Query() payload) {
		return await this.feedbackService.query(payload);
	}

	@Post()
	async create(@Body() dto: any, @CurrentUser() user) {

		dto.user = user;

		return await this.feedbackService.save(dto);
	}

	@Put()
	async update(@Body() dto: any, @CurrentUser() user) {

		dto.user = user;

		return await this.feedbackService.save(dto);
	}

	@Delete()
	async remove(@Query() payload) {
		return await this.feedbackService.remove(payload.selectedRows.split(','));
	}
}
