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
import { ServiceCategoryService } from '../../common/services/service-category.service';

@Api('service/category')
@ApiUseTags('service/category')
@ApiBearerAuth()
@UseGuards(AuthGuard())
@UseInterceptors(ClassSerializerInterceptor)
export class ServiceCategoryController {
    constructor(private readonly categoryService: ServiceCategoryService) {}

    @Get(':id')
    async findOne(@Param('id') id) {
        if (!id) throw new BadRequestException('参数 id 错误');

        return await this.categoryService.findOneById(id);
    }

    @Get('list')
    async list(@Query() payload) {
        return await this.categoryService.query(payload);
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
