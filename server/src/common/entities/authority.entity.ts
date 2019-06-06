import { plainToClass } from 'class-transformer';
import { Base } from './base';
import { Entity, Column, Tree, TreeParent, TreeChildren, ManyToMany } from 'typeorm';
import { ExcelHandleType } from '../lib/excel';
import { Role } from '../../common/entities/role.entity';

@Entity()
@Tree('materialized-path')
export class Authority extends Base {
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

    @TreeChildren() children: Authority[];

    @TreeParent() parent: Authority;

    @ManyToMany(type => Role, role => role.authoritys)
    roles: Role[];

    static readonly sheetsMap: object = {
        权限: {
            map: 'authoritys',
            handleType: ExcelHandleType.ARRAY,
            cellsMap: { ID: 'id', 名称: 'name', 标识: 'token', 描述: 'desc', 排序: 'sort', PID: 'parent' }
        }
    };

    static create(target: Object) {
        return plainToClass(Authority, target);
    }
}
