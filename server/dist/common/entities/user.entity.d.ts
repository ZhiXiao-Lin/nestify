import { Base } from './base';
import { Content } from './content.entity';
export declare class User extends Base {
    mobile: string;
    password: string;
    contents: Content[];
    beforeInsert(): Promise<void>;
}
