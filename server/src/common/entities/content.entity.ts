import * as moment from 'moment';
import {
    Entity,
    Column,
    ManyToOne,
    BeforeInsert,
    BeforeUpdate,
    AfterInsert,
    AfterUpdate,
    BeforeRemove
} from 'typeorm';
import { plainToClass, Expose } from 'class-transformer';
import { Base } from './base';
import { Category } from './category.entity';
import { ExcelHandleType } from '../lib/excel';
import { es } from '../lib/es';
import { textInterception, extractionTextInHtml } from '../lib/helper';
import { IndicesCreateParams } from 'elasticsearch';

const handleType = ExcelHandleType.ARRAY;
const cellsMap = {
    标题: 'title',
    作者: 'author',
    来源: 'source',
    地址: 'address',
    排序: 'sort',
    发布时间: 'publish_at',
    正文: 'text',
    图片: 'thumbnail',
    视频: 'video',
    分类: 'category'
};

@Entity()
export class Content extends Base {
    @Column({ comment: '标题', default: '' })
    title: string;

    @Column({ comment: '作者', default: '' })
    author: string;

    @Column({ comment: '来源', default: '本站' })
    source: string;

    @Column({ comment: '地址', default: '' })
    address: string;

    @Column({ comment: '排序', default: 0 })
    sort: number;

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

    @ManyToOne((type) => Category, (category) => category.contents)
    category: Category;

    static readonly sheetsMap: object = {
        通知: {
            handleType,
            cellsMap
        },
        频道: {
            handleType,
            cellsMap
        },
        实践中心: {
            handleType,
            cellsMap
        },
        培训: {
            handleType,
            cellsMap
        },
    };

    static readonly esIndex: IndicesCreateParams = {
        index: 'contents',
        body: {
            mappings: {
                content: {
                    properties: {
                        title: {
                            type: 'text',
                            analyzer: 'ik_max_word',
                            search_analyzer: 'ik_max_word'
                        },
                        text: {
                            type: 'text',
                            analyzer: 'ik_max_word',
                            search_analyzer: 'ik_max_word'
                        },
                        summary: {
                            type: 'text',
                            analyzer: 'ik_max_word',
                            search_analyzer: 'ik_max_word'
                        },
                        category: {
                            type: 'text',
                            analyzer: 'ik_max_word',
                            search_analyzer: 'ik_max_word'
                        },
                        thumbnail: {
                            type: 'string'
                        },
                        video: {
                            type: 'string'
                        },
                        author: {
                            type: 'text',
                            analyzer: 'ik_max_word',
                            search_analyzer: 'ik_max_word'
                        },
                        views: {
                            type: 'integer'
                        },
                        publish_at: {
                            type: 'string'
                        }
                    }
                }
            }
        }
    };

    static create(target: object): Content | Content[] {
        return plainToClass(Content, target);
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
        if (!this.publish_at) {
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

    // @AfterInsert()
    // async afterInsert() {
    //     await es.index({
    //         index: Content.esIndex.index,
    //         type: Content.esIndex.body.type,
    //         id: this.id,
    //         body: {
    //             title: this.title,
    //             text: this.text,
    //             summary: this.summary,
    //             category: this.category.name,
    //             thumbnail: this.thumbnailPath,
    //             video: this.videoPath,
    //             views: this.views,
    //             author: this.author,
    //             publish_at: this.publish_at
    //         }
    //     });
    // }

    // @AfterUpdate()
    // async afterUpdate() {
    //     const doc = {
    //         title: this.title,
    //         text: this.text,
    //         summary: this.summary,
    //         thumbnail: this.thumbnailPath,
    //         video: this.videoPath,
    //         views: this.views,
    //         author: this.author,
    //         publish_at: this.publish_at
    //     };

    //     if (!!this.category) {
    //         doc['category'] = this.category.name;
    //     }

    //     await es.update({
    //         index: Content.esIndex.index,
    //         type: Content.esIndex.body.type,
    //         id: this.id,
    //         body: {
    //             doc
    //         }
    //     });
    // }

    // @BeforeRemove()
    // async beforeRemove() {
    //     await es.delete({
    //         index: Content.esIndex.index,
    //         type: Content.esIndex.body.type,
    //         id: this.id
    //     });
    // }
}
