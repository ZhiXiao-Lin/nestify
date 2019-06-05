import { plainToClass } from 'class-transformer';
import { Base } from './base';
import { Entity, Column, ManyToOne } from 'typeorm';
import { Organization } from './organization.entity';
import { ExcelHandleType } from '../lib/excel';

@Entity()
export class Role extends Base {
    @Column({
        comment: '名称',
    })
    name: string;

    @Column({ comment: '描述', default: '' })
    desc: string;

    @Column({ comment: '排序', default: 0 })
    sort: number;

    @Column({ type: 'simple-json', default: {}, comment: '扩展信息' })
    ex_info: any;

    @ManyToOne((type) => Organization, (organization) => organization.roles)
    organization: Organization;

    static readonly sheetsMap: object = {
        角色: {
            map: 'roles',
            handleType: ExcelHandleType.ARRAY,
            cellsMap: { ID: 'id', 名称: 'name', 描述: 'desc', 排序: 'sort', 组织: 'organization' }
        }
    };

    static create(target: Object) {
        return plainToClass(Role, target);
    }
}
