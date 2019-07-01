import {
    Entity,
    Column,
    ManyToOne,
} from 'typeorm';
import { plainToClass } from 'class-transformer';
import { Base } from './base';
import { User } from './user.entity';

@Entity()
export class Feedback extends Base {
    @Column({ comment: '标题' })
    title: string;

    @Column({ comment: '详情', default: '' })
    desc: string;

    @Column({ type: 'simple-json', default: {}, comment: '扩展信息' })
    ex_info: any;

    @ManyToOne((type) => User, (user) => user.feedbacks)
    user: User;

    static create(target: object): Feedback | Feedback[] {
        return plainToClass(Feedback, target);
    }
}
