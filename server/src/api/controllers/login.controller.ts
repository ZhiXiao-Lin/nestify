import { Post, UsePipes, ValidationPipe, Body } from '@nestjs/common';
import { ApiUseTags } from '@nestjs/swagger';
import { Api } from '../../common/aspects/decorator';
import { LoginDto } from '../../common/dtos/login.dto';
import { UserService } from '../../common/services/user.service';

@Api('login')
@ApiUseTags('login')
export class LoginController {
    constructor(private readonly userService: UserService) {}

    @Post()
    @UsePipes(new ValidationPipe())
    async login(@Body() dto: LoginDto) {
        return await this.userService.login(dto.account, dto.password);
    }
}
