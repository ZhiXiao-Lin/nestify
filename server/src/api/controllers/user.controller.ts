import {
    Get,
    Body,
    Put,
    Param,
    UseInterceptors,
    ClassSerializerInterceptor,
    UseGuards,
    UsePipes,
    ValidationPipe,
    Query,
    Post,
    Delete
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiUseTags, ApiBearerAuth } from '@nestjs/swagger';
import { Api, CurrentUser } from '../../common/aspects/decorator';
import { UserService } from '../../common/services/user.service';
import { PasswordDto } from '../../common/dtos/password.dto';

@Api('user')
@ApiUseTags('user')
@ApiBearerAuth()
@UseGuards(AuthGuard())
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get(':id')
    @UseInterceptors(ClassSerializerInterceptor)
    async fetch(@Param() params) {
        return await this.userService.findOneById(params.id);
    }

    @Get('list')
    async list(@Query() payload) {
        return await this.userService.query(payload);
    }

    @Get('current')
    @UseInterceptors(ClassSerializerInterceptor)
    async current(@CurrentUser() user) {
        return await this.userService.findCurrent(user.id);
    }

    @Put('password')
    @UsePipes(new ValidationPipe())
    async changePassword(@CurrentUser() user, @Body() dto: PasswordDto) {
        return await this.userService.changePassword(user.id, dto);
    }

    @Post()
    async create(@Body() dto: any) {
        return await this.userService.save(dto);
    }

    @Put()
    async update(@Body() dto: any) {
        return await this.userService.save(dto);
    }

    @Delete()
    async remove(@Query() payload) {
        return await this.userService.remove(payload.selectedRows.split(','));
    }
}
