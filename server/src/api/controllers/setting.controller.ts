import { ApiUseTags, ApiBearerAuth } from '@nestjs/swagger';
import { UseGuards, Get, Put, Body, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Api } from '../../common/aspects/decorator';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { SettingService } from '../../common/services/setting.service';

@Api('setting')
@ApiUseTags('setting')
@ApiBearerAuth()
@UseGuards(AuthGuard())
@UseInterceptors(ClassSerializerInterceptor)
export class SettingController {
    constructor(private readonly settingService: SettingService) {}

    @Get('')
    async findOne() {
        return await this.settingService.getSettingByToken();
    }

    @Put()
    async update(@Body() dto: any) {
        return await this.settingService.save(dto);
    }
}
