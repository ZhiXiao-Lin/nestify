import { Entity, Column, ManyToOne } from 'typeorm';
import { Base } from './base';
import { plainToClass } from 'class-transformer';
import { User } from './user.entity';

@Entity()
export class Detail extends Base {
    @Column({
        comment: '标题'
    })
    title: string;

    @Column({ comment: '积分', default: 0 })
    value: number;

    @Column({ type: 'simple-json', default: {}, comment: '扩展信息' })
    ex_info: any;

    @ManyToOne((type) => User, (user) => user.details)
    user: User;

    static create(target: Object) {
        return plainToClass(Detail, target);
    }
}
