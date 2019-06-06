import { plainToClass, Expose } from 'class-transformer';
import { Base } from './base';
import { Entity, Column, Tree, TreeChildren, TreeParent } from 'typeorm';
import { ExcelHandleType } from '../lib/excel';

@Entity()
@Tree('materialized-path')
export class Organization extends Base {
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

    @TreeChildren() children: Organization[];

    @TreeParent() parent: Organization;

    @Expose()
    get title(): string {
        return this.name;
    }

    @Expose()
    get key(): string {
        return this.id;
    }

    @Expose()
    get value(): string {
        return this.id;
    }

    static readonly sheetsMap: object = {
        组织架构: {
            map: 'organizations',
            handleType: ExcelHandleType.ARRAY,
            cellsMap: { ID: 'id', 名称: 'name', 描述: 'desc', 排序: 'sort', PID: 'parent' }
        }
    };

    static create(target: Object) {
        return plainToClass(Organization, target);
    }
}
