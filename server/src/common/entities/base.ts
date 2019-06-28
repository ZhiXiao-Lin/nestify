import { PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Column } from 'typeorm';
import { config } from '../../config';
import { RowStatus, StorageType } from '../aspects/enum';
import { Exclude } from 'class-transformer';

export abstract class Base {
    @PrimaryGeneratedColumn('uuid') id: string;

    @Exclude()
    @Column({
        type: 'enum',
        default: RowStatus.NORMAL,
        enum: RowStatus,
        comment: '行状态'
    })
    row_status: RowStatus;

    @CreateDateColumn({
        comment: '创建时间'
    })
    create_at: number;

    @UpdateDateColumn({
        comment: '更新时间'
    })
    update_at: number;

    static getFullPath(info: any) {
        if (!!info) {
            switch (info.storageType) {
                case StorageType.LOCAL:
                    return info.path.startsWith('/')
                        ? `${config.serverUrl}/${config.static.root}${info.path}`
                        : info.path;
                case StorageType.QINIU:
                    return `${config.qiniu.domain}/${info.path}`;
                default:
                    return info.path;
            }
        }

        return '';
    }
}
