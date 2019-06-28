import { Entity, Column } from 'typeorm';
import { Base } from './base';
import { plainToClass } from 'class-transformer';
import { NoticeType } from '../aspects/enum';

@Entity()
export class Notice extends Base {
    @Column({
        comment: '标题'
    })
    title: string;

    @Column({
        comment: '摘要',
        default: ''
    })
    description: string;

    @Column({
        comment: '类型',
        default: NoticeType.MESSAGE
    })
    type: NoticeType;

    @Column({ type: 'simple-json', default: {}, comment: '扩展信息' })
    ex_info: any;

    static create(target: Object) {
        return plainToClass(Notice, target);
    }
}
