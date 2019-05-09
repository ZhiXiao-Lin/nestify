import { RowStatus } from '../aspects/enum';
export declare abstract class Base {
    id: string;
    ex_info: any;
    row_status: RowStatus;
    create_at: number;
    update_at: number;
}
