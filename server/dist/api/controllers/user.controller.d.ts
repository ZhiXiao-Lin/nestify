import { UserService } from '../../common/services/user.service';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    fetch(params: any): Promise<import("../../common/entities/user.entity").User>;
    current(user: any): Promise<import("../../common/entities/user.entity").User>;
}
