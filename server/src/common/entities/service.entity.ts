import * as _ from 'lodash';
import * as moment from 'moment';
import {
    Entity,
    Column,
    ManyToOne,
    BeforeInsert,
    BeforeUpdate,
} from 'typeorm';
import { plainToClass, Expose } from 'class-transformer';
import { Base } from './base';
import { ServiceCategory } from './service-category.entity';
import { ExcelHandleType } from '../lib/excel';
import { textInterception, extractionTextInHtml } from '../lib/helper';


const handleType = ExcelHandleType.ARRAY;
const cellsMap = {
    标题: 'title',
    发布时间: 'publish_at',
    正文: 'text',
    图片: 'thumbnail',
    视频: 'video'
};

@Entity()
export class Service extends Base {
    @Column({ comment: '标题', default: '' })
    title: string;

    @Column({ type: 'simple-json', default: null, comment: '图片' })
    thumbnail: any;

    @Column({ type: 'simple-json', default: null, comment: '视频' })
    video: any;

    @Column({ comment: '摘要', default: '' })
    summary: string;

    @Column({ comment: '正文', default: '' })
    text: string;

    @Column({ type: 'bigint', comment: '浏览量', default: 0 })
    views: number;

    @Column({ type: 'simple-json', default: {}, comment: '扩展信息' })
    ex_info: any;

    @Column({
        type: 'timestamp',
        default: null,
        comment: '发布时间'
    })
    publish_at: string;

    @ManyToOne((type) => ServiceCategory, (category) => category.services)
    category: ServiceCategory;

    static readonly sheetsMap: object = {
        服务分类: {
            handleType,
            cellsMap
        }
    };

    static create(target: object): Service | Service[] {
        return plainToClass(Service, target);
    }

    @Expose()
    get thumbnailPath(): string {
        return Base.getFullPath(this.thumbnail);
    }

    @Expose()
    get videoPath(): string {
        return Base.getFullPath(this.video);
    }

    @BeforeInsert()
    async beforeInsert() {
        if (_.isEmpty(this.publish_at)) {
            this.publish_at = moment().format('YYYY-MM-DD HH:mm:ss');
        }
        const text = extractionTextInHtml(this.text);
        this.summary = textInterception(text, 120);
    }

    @BeforeUpdate()
    async beforeUpdate() {
        const text = extractionTextInHtml(this.text);
        this.summary = textInterception(text, 120);
    }
}
