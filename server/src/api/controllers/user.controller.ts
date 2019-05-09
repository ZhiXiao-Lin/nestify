import { Get, Param, UseInterceptors, ClassSerializerInterceptor, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiUseTags, ApiBearerAuth } from '@nestjs/swagger';
import { Api } from '../../common/aspects/decorator';
import { UserService } from '../../common/services/user.service';

@Api('user')
@ApiUseTags('user')
@ApiBearerAuth()
@UseGuards(AuthGuard())
export class UserController {
	constructor(private readonly userService: UserService) {}

	@Get(':id')
	@UseInterceptors(ClassSerializerInterceptor)
	async fetch(@Param() params) {
		return await this.userService.getOneById(params.id);
	}
}
