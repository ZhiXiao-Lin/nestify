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
import { FlowTemplateService } from '../../common/services/flow-template.service';

@Api('flow/template')
@ApiUseTags('flow/template')
@ApiBearerAuth()
@UseGuards(AuthGuard())
@UseInterceptors(ClassSerializerInterceptor)
export class FlowTemplateController {
    constructor(private readonly flowTemplateService: FlowTemplateService) {}

    @Get(':id')
    async findOne(@Param('id') id) {
        if (!id) throw new BadRequestException('参数 id 错误');

        return await this.flowTemplateService.findOneById(id);
    }

    @Get('list')
    async list(@Query() payload) {
        return await this.flowTemplateService.query(payload);
    }

    @Get('export')
    async export(@Query() payload) {
        return await this.flowTemplateService.query(payload);
    }

    @Post()
    async create(@Body() dto: any) {
        return await this.flowTemplateService.save(dto);
    }

    @Put()
    async update(@Body() dto: any) {
        return await this.flowTemplateService.save(dto);
    }

    @Delete()
    async remove(@Query() payload) {
        return await this.flowTemplateService.remove(payload.selectedRows.split(','));
    }
}
