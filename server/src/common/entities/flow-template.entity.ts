import { Base } from './base';
import { Entity, Column, OneToMany } from 'typeorm';
import { FlowTemplateEnum } from '../aspects/enum';
import { Flow } from './flow.entity';
import { plainToClass } from 'class-transformer';

@Entity()
export class FlowTemplate extends Base {
    @Column({
        unique: true,
        comment: '模板名称'
    })
    name: string;

    @Column({
        unique: true,
        comment: '模板'
    })
    template: FlowTemplateEnum;

    @Column({ type: 'simple-json', default: {}, comment: '扩展信息' })
    ex_info: any;

    @OneToMany((type) => Flow, (flow) => flow.template)
    flows: Flow[];

    static create(target: Object) {
        return plainToClass(FlowTemplate, target);
    }
}
