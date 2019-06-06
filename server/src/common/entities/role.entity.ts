import { plainToClass, Expose } from 'class-transformer';
import { Base } from './base';
import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';
import { ExcelHandleType } from '../lib/excel';
import { Authority } from './authority.entity';
import { User } from './user.entity';

@Entity()
export class Role extends Base {
    @Column({
        comment: '名称',
    })
    name: string;

    @Column({
        comment: '标识',
        unique: true
    })
    token: string;

    @Column({ comment: '描述', default: '' })
    desc: string;

    @Column({ comment: '排序', default: 0 })
    sort: number;

    @Column({ type: 'simple-json', default: {}, comment: '扩展信息' })
    ex_info: any;

    @ManyToMany(type => Authority, authority => authority.roles)
    @JoinTable()
    authoritys: Authority[];

    @ManyToMany(type => User, user => user.roles)
    users: User[];

    static readonly sheetsMap: object = {
        角色: {
            map: 'roles',
            handleType: ExcelHandleType.ARRAY,
            cellsMap: { ID: 'id', 名称: 'name', 标识: 'token', 描述: 'desc', 排序: 'sort' }
        }
    };

    static create(target: Object) {
        return plainToClass(Role, target);
    }

    @Expose()
    get isSuperAdmin(): boolean {
        return this.token === 'superAdmin';
    }
}
