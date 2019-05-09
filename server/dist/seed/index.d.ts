import { Connection, Repository } from 'typeorm';
import { User } from '../common/entities/user.entity';
export declare class Seed {
    private readonly connection;
    private readonly userRepository;
    constructor(connection: Connection, userRepository: Repository<User>);
    start(): Promise<void>;
}
