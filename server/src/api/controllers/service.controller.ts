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
import { ServiceService } from '../../common/services/service.service';
import { ApplyServiceDto } from '../../common/dtos/apply-service.dto';

@Api('service')
@ApiUseTags('service')
@ApiBearerAuth()
@UseGuards(AuthGuard())
@UseInterceptors(ClassSerializerInterceptor)
export class ServiceController {
    constructor(private readonly serviceService: ServiceService) { }

    @Get(':id')
    async findOne(@Param('id') id) {
        if (!id) throw new BadRequestException('参数 id 错误');

        return await this.serviceService.findOneById(id);
    }

    @Get('list')
    async list(@Query() payload) {
        return await this.serviceService.query(payload);
    }

    @Get('export')
    async export(@Query() payload) {
        return await this.serviceService.query(payload);
    }

    @Post()
    async create(@Body() dto: any) {
        return await this.serviceService.save(dto);
    }

    @Post('apply')
    async apply(@CurrentUser() user, @Body() dto: ApplyServiceDto) {

        return await this.serviceService.apply(user, dto);
    }

    @Put()
    async update(@Body() dto: any) {
        return await this.serviceService.save(dto);
    }

    @Delete()
    async remove(@Query() payload) {
        return await this.serviceService.remove(payload.selectedRows.split(','));
    }
}
