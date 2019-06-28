import * as _ from 'lodash';
import { Entity, Column } from 'typeorm';
import { plainToClass, Expose } from 'class-transformer';
import { Base } from './base';

@Entity()
export class Carousel extends Base {
    @Column({ comment: '标题', unique: true })
    token: string;

    @Column({ type: 'simple-json', default: {}, comment: '扩展信息' })
    ex_info: any;

    static create(target: object): Carousel | Carousel[] {
        return plainToClass(Carousel, target);
    }

    @Expose()
    get carousels() {
        return !this.ex_info.carousels
            ? []
            : this.ex_info.carousels.map((item) => {
                  const newItem = { ...item };
                  newItem.image = Base.getFullPath(item.image);
                  return newItem;
              });
    }
}
