import * as _ from 'lodash';
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
import { es } from '../lib/elastic-search';
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
    视频: 'video'
};
const rowsMap = {
    id: {
        header: '编号'
    },
    title: {
        header: '标题'
    },
    author: {
        header: '作者'
    },
    source: {
        header: '来源'
    },
    address: {
        header: '地址'
    },
    sort: {
        header: '排序'
    },
    thumbnailPath: {
        header: '图片',
        key: 'thumbnail',
        handler: (val) => Content.getFullPath(val)
    },
    videoPath: {
        header: '视频',
        key: 'video',
        handler: (val) => Content.getFullPath(val)
    },
    summary: {
        header: '摘要'
    },
    text: {
        header: '正文'
    },
    views: {
        header: '浏览量'
    },
    publish_at: {
        header: '发布时间',
        handler: (val) => (val ? moment(val).format('YYYY-MM-DD HH:mm:ss') : '')
    },
    update_at: {
        header: '修改时间',
        handler: (val) => (val ? moment(val).format('YYYY-MM-DD HH:mm:ss') : '')
    },
    category: {
        header: '分类',
        handler: (val) => (val ? val.name : '')
    }
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

    @Column({ comment: '图片', default: '' })
    thumbnail: string;

    @Column({ comment: '视频', default: '' })
    video: string;

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
        景区介绍: {
            handleType,
            cellsMap,
            rowsMap
        },
        地理概况: {
            handleType,
            cellsMap,
            rowsMap
        },
        人文历史: {
            handleType,
            cellsMap,
            rowsMap
        },
        工艺特色: {
            handleType,
            cellsMap,
            rowsMap
        },
        发展规划: {
            handleType,
            cellsMap,
            rowsMap
        },
        当地特产: {
            handleType,
            cellsMap,
            rowsMap
        },
        特色工艺品: {
            handleType,
            cellsMap,
            rowsMap
        },
        游览须知: {
            handleType,
            cellsMap,
            rowsMap
        },

        景点一览: {
            handleType,
            cellsMap,
            rowsMap
        },
        全景720度: {
            map: '720度全景',
            handleType,
            cellsMap,
            rowsMap
        },
        电子导游导览: {
            handleType,
            cellsMap,
            rowsMap
        },
        摄影佳作: {
            handleType,
            cellsMap,
            rowsMap
        },
        视频赏析: {
            handleType,
            cellsMap,
            rowsMap
        },

        特色餐饮: {
            handleType,
            cellsMap,
            rowsMap
        },
        周边住宿: {
            handleType,
            cellsMap,
            rowsMap
        },
        旅游购物: {
            handleType,
            cellsMap,
            rowsMap
        },
        周边娱乐: {
            handleType,
            cellsMap,
            rowsMap
        },
        游程推荐: {
            handleType,
            cellsMap,
            rowsMap
        },
        美文游记: {
            handleType,
            cellsMap,
            rowsMap
        },

        官方公告: {
            handleType,
            cellsMap,
            rowsMap
        },
        精彩活动: {
            handleType,
            cellsMap,
            rowsMap
        },
        新闻动态: {
            handleType,
            cellsMap,
            rowsMap
        },
        联系方式: {
            handleType,
            cellsMap: {
                公司名称: 'ex_info.company',
                电话: 'ex_info.phone',
                传真: 'ex_info.fax',
                销售: 'ex_info.sale',
                地址: 'ex_info.address',
                邮编: 'ex_info.postcode'
            },
            rowsMap: {
                'ex_info.company': {
                    header: '公司名称',
                    handler: (val) => val.company
                },
                'ex_info.phone': {
                    header: '电话',
                    handler: (val) => val.phone
                },
                'ex_info.fax': {
                    header: '传真',
                    handler: (val) => val.fax
                },
                'ex_info.sale': {
                    header: '销售',
                    handler: (val) => val.sale
                },
                'ex_info.address': {
                    header: '地址',
                    handler: (val) => val.address
                },
                'ex_info.postcode': {
                    header: '邮编',
                    handler: (val) => val.postcode
                }
            }
        },
        留言咨询: {
            handleType,
            cellsMap: {
                问题: 'ex_info.question',
                回复: 'ex_info.reply'
            },
            rowsMap: {
                'ex_info.question': {
                    header: '问题',
                    handler: (val) => val.question
                },
                'ex_info.reply': {
                    header: '回复',
                    handler: (val) => val.reply
                },
                update_at: {
                    header: '回复时间',
                    handler: (val) => (val ? moment(val).format('YYYY-MM-DD HH:mm:ss') : '')
                },
                create_at: {
                    header: '留言时间',
                    handler: (val) => (val ? moment(val).format('YYYY-MM-DD HH:mm:ss') : '')
                }
            }
        },
        投诉建议: {
            handleType,
            cellsMap: {
                昵称: 'ex_info.nickname',
                标题: 'ex_info.title',
                内容: 'ex_info.content',
                电话: 'ex_info.phone'
            },
            rowsMap: {
                'ex_info.nickname': {
                    header: '昵称',
                    handler: (val) => val.nickname
                },
                'ex_info.title': {
                    header: '标题',
                    handler: (val) => val.title
                },
                'ex_info.content': {
                    header: '内容',
                    handler: (val) => val.content
                },
                'ex_info.phone': {
                    header: '电话',
                    handler: (val) => val.phone
                },
                create_at: {
                    header: '提交时间',
                    handler: (val) => (val ? moment(val).format('YYYY-MM-DD HH:mm:ss') : '')
                }
            }
        }
    };

    static readonly esIndex: IndicesCreateParams = {
        index: 'contents',
        body: {
            type: 'content',
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

    @AfterInsert()
    async afterInsert() {
        await es.index({
            index: Content.esIndex.index,
            type: Content.esIndex.body.type,
            id: this.id,
            body: {
                title: this.title,
                text: this.text,
                summary: this.summary,
                category: this.category.name,
                thumbnail: this.thumbnailPath,
                video: this.videoPath,
                views: this.views,
                author: this.author,
                publish_at: this.publish_at
            }
        });
    }

    @AfterUpdate()
    async afterUpdate() {
        const doc = {
            title: this.title,
            text: this.text,
            summary: this.summary,
            thumbnail: this.thumbnailPath,
            video: this.videoPath,
            views: this.views,
            author: this.author,
            publish_at: this.publish_at
        };

        if (!!this.category) {
            doc['category'] = this.category.name;
        }

        await es.update({
            index: Content.esIndex.index,
            type: Content.esIndex.body.type,
            id: this.id,
            body: {
                doc
            }
        });
    }

    @BeforeRemove()
    async beforeRemove() {
        await es.delete({
            index: Content.esIndex.index,
            type: Content.esIndex.body.type,
            id: this.id
        });
    }
}
