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
import { FlowService } from '../../common/services/flow.service';

@Api('flow')
@ApiUseTags('flow')
@ApiBearerAuth()
@UseGuards(AuthGuard())
@UseInterceptors(ClassSerializerInterceptor)
export class FlowController {
    constructor(private readonly flowService: FlowService) { }

    @Get(':id')
    async findOne(@Param('id') id) {
        if (!id) throw new BadRequestException('参数 id 错误');

        return await this.flowService.findOneById(id);
    }

    @Get('list')
    async list(@Query() payload) {
        return await this.flowService.query(payload);
    }

    @Get('requirement')
    async requirement(@Query() payload, @CurrentUser() user) {

        payload.userId = user.id;

        return await this.flowService.requirement(payload);
    }

    @Get('task')
    async task(@Query() payload, @CurrentUser() user) {

        payload.userId = user.id;

        return await this.flowService.task(payload);
    }

    @Post('dispatch')
    async dispatch(@Body() payload) {
        return await this.flowService.dispatch(payload);
    }

    @Get('export')
    async export(@Query() payload) {
        return await this.flowService.query(payload);
    }

    @Post()
    async create(@Body() dto: any) {
        return await this.flowService.save(dto);
    }

    @Put()
    async update(@Body() dto: any) {
        return await this.flowService.save(dto);
    }

    @Delete()
    async remove(@Query() payload) {
        return await this.flowService.remove(payload.selectedRows.split(','));
    }
}
