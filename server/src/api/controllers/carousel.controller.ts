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
    UseInterceptors,
    ClassSerializerInterceptor
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Api } from '../../common/aspects/decorator';
import { CarouselService } from '../../common/services/carousel.service';

@Api('carousel')
@ApiUseTags('carousel')
@ApiBearerAuth()
@UseGuards(AuthGuard())
@UseInterceptors(ClassSerializerInterceptor)
export class CarouselController {
    constructor(private readonly carouseService: CarouselService) {}

    @Get(':id')
    async findOne(@Param('id') id) {
        if (!id) throw new BadRequestException('参数 id 错误');

        return await this.carouseService.findOneById(id);
    }

    @Get('detail/:token')
    async detail(@Param('token') token) {
        return await this.carouseService.findOneByToken(token);
    }

    @Get('list')
    async list(@Query() payload) {
        return await this.carouseService.query(payload);
    }

    @Get('export')
    async export(@Query() payload) {
        return await this.carouseService.query(payload);
    }

    @Post()
    async create(@Body() dto: any) {
        return await this.carouseService.save(dto);
    }

    @Put()
    async update(@Body() dto: any) {
        return await this.carouseService.save(dto);
    }

    @Delete()
    async remove(@Query() payload) {
        return await this.carouseService.remove(payload.selectedRows.split(','));
    }
}
