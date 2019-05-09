import { UserService } from '../services/user.service';
import { User } from '../entities/user.entity';
declare const JwtStrategy_base: new (...args: any[]) => any;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly userService;
    constructor(userService: UserService);
    validate(payload: User): Promise<User>;
}
export {};
