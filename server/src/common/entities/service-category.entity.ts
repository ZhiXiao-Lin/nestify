import { Base } from './base';
import { Entity, Column, Tree, TreeChildren, TreeParent, OneToMany } from 'typeorm';
import { plainToClass, Expose } from 'class-transformer';
import { ExcelHandleType } from '../lib/excel';
import { Service } from './service.entity';

@Entity()
@Tree('materialized-path')
export class ServiceCategory extends Base {
    @Column({ comment: '名称', unique: true })
    name: string;

    @Column({ comment: '排序', default: 0 })
    sort: number;

    @Column({ type: 'simple-json', default: {}, comment: '扩展信息' })
    ex_info: any;

    @OneToMany((type) => Service, (service) => service.category)
    services: Service[];

    @TreeChildren() children: ServiceCategory[];

    @TreeParent() parent: ServiceCategory;

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
        分类: {
            map: 'categorys',
            handleType: ExcelHandleType.ARRAY,
            cellsMap: { ID: 'id', 名称: 'name', 排序: 'sort', PID: 'parent' }
        }
    };

    static create(target: object) {
        return plainToClass(ServiceCategory, target);
    }
}
