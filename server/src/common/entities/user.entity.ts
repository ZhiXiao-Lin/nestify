import * as bcrypt from 'bcryptjs';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { Base } from './base';
import { Entity, Column, BeforeInsert, ManyToOne, BeforeUpdate, OneToMany } from 'typeorm';
import { Gender, VIP } from '../aspects/enum';
import { Role } from './role.entity';
import { Organization } from './organization.entity';
import { getVIP } from '../lib/helper';
import { Flow } from './flow.entity';
import { Feedback } from './feedback.entity';
import { Detail } from './detail.entity';

@Entity()
export class User extends Base {
    @Column({
        comment: '帐号',
        unique: true
    })
    account: string;

    @Exclude({ toPlainOnly: true })
    @Column({ comment: '密码' })
    password: string;

    @Column({ comment: '昵称', default: '' })
    nickname: string;

    @Column({ comment: '微信 openid', default: '' })
    wechatOpenid: string;

    @Column({ comment: '微信 unionid', default: '' })
    wechatUnionid: string;

    @Column({ type: 'simple-json', default: null, comment: '头像' })
    avatar: any;

    @Column({ comment: '性别', default: Gender.MALE })
    gender: Gender;

    @Column({ comment: '等级', default: VIP.V0 })
    vip: VIP;

    @Column({ comment: '积分', default: 0 })
    points: number;

    @Column({ comment: '真实姓名', default: '' })
    realName: string;

    @Column({ comment: '手机号', default: '' })
    phone: string;

    @Column({ comment: '身份证号', default: '' })
    idCard: string;

    @Column({ comment: '联系地址', default: '' })
    address: string;

    @Column({ comment: '状态', default: '' })
    status: string;

    @Column({ type: 'simple-json', default: {}, comment: '扩展信息' })
    ex_info: any;

    @ManyToOne((type) => Role, (role) => role.users)
    role: Role;

    @ManyToOne((type) => Organization, (org) => org.users)
    org: Organization;

    @OneToMany((type) => Feedback, (feedback) => feedback.user)
    feedbacks: Feedback[];

    @OneToMany((type) => Flow, (flow) => flow.user)
    flows: Flow[];

    @OneToMany((type) => Flow, (flow) => flow.operator)
    operateFlows: Flow[];

    @OneToMany((type) => Flow, (flow) => flow.executor)
    executeFlows: Flow[];

    @OneToMany((type) => Detail, (detail) => detail.user)
    details: Detail[];

    static create(target: Object) {
        return plainToClass(User, target);
    }

    @Expose()
    get avatarPath(): string {
        return Base.getFullPath(this.avatar);
    }

    @Expose()
    get isSuperAdmin(): boolean {
        return !!this.role && this.role.token === 'superAdmin';
    }

    @Expose()
    get isVolunteer(): boolean {
        return !!this.role && this.role.token === 'volunteer';
    }

    @BeforeInsert()
    async beforeInsert() {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password || '12345678', salt);
    }

    @BeforeUpdate()
    async beforeUpdate() {
        this.vip = getVIP(this.points);
    }
}
