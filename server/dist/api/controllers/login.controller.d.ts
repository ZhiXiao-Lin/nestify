import { LoginDto } from '../../common/dtos/login.dto';
import { UserService } from '../../common/services/user.service';
export declare class LoginController {
    private readonly userService;
    constructor(userService: UserService);
    login(dto: LoginDto): Promise<string>;
}
