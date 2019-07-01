import { Entity, Column, ManyToOne } from 'typeorm';
import { plainToClass, Expose } from 'class-transformer';
import { Base } from './base';
import { ExcelHandleType } from '../lib/excel';
import { ServiceCategory } from './service-category.entity';

const handleType = ExcelHandleType.ARRAY;
const cellsMap = {
    标题: 'title',
    封面: 'cover',
    排序: 'sort',
    详情: 'desc',
    分类: 'category'
};

@Entity()
export class Service extends Base {
    @Column({ comment: '标题' })
    title: string;

    @Column({ comment: '排序', default: 0 })
    sort: number;

    @Column({ type: 'simple-json', default: null, comment: '封面' })
    cover: any;

    @Column({ type: 'simple-json', default: null, comment: '相册' })
    album: any;

    @Column({ comment: '详情', default: '' })
    desc: string;

    @Column({ comment: '须知', default: '' })
    notice: string;

    @Column({ type: 'simple-json', default: {}, comment: '扩展信息' })
    ex_info: any;

    @ManyToOne((type) => ServiceCategory, (category) => category.services)
    category: ServiceCategory;

    static readonly sheetsMap: object = {
        服务: {
            handleType,
            cellsMap
        }
    };

    static create(target: object): Service | Service[] {
        return plainToClass(Service, target);
    }

    @Expose()
    get coverPath(): string {
        return Base.getFullPath(this.cover);
    }
}
