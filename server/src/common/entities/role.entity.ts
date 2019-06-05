import { plainToClass } from 'class-transformer';
import { Base } from './base';
import { Entity, Column, ManyToOne } from 'typeorm';
import { Organization } from './organization.entity';

@Entity()
export class Role extends Base {
    @Column({
        comment: '名称',
    })
    name: string;

    @Column({ comment: '头像', default: '' })
    avatar: string;

    @Column({ type: 'simple-json', default: {}, comment: '扩展信息' })
    ex_info: any;

    @ManyToOne((type) => Organization, (organization) => organization.roles)
    organization: Organization;

    static create(target: Object) {
        return plainToClass(Role, target);
    }
}
