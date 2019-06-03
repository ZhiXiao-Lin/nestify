import { Get, Body, Put, Param, UseInterceptors, ClassSerializerInterceptor, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
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
	constructor(private readonly userService: UserService) { }

	@Get(':id')
	@UseInterceptors(ClassSerializerInterceptor)
	async fetch(@Param() params) {
		return await this.userService.findOneById(params.id);
	}

	@Get('current')
	@UseInterceptors(ClassSerializerInterceptor)
	async current(@CurrentUser() user) {
		return await this.userService.findOneById(user.id);
	}

	@Put('password')
	@UsePipes(new ValidationPipe())
	async changePassword(@CurrentUser() user, @Body() dto: PasswordDto) {
		return await this.userService.changePassword(user.id, dto);
	}

	@Put()
	async update(@Body() dto: any) {
		return await this.userService.save(dto);
	}
}
