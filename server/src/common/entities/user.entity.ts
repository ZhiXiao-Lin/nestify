import * as bcrypt from 'bcryptjs';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { Base } from './base';
import { Entity, Column, BeforeInsert, ManyToMany, ManyToOne, JoinTable } from 'typeorm';
import { Gender } from '../aspects/enum';
import { Role } from './role.entity';
import { Organization } from './organization.entity';

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

    @Column({ comment: '头像', default: '' })
    avatar: string;

    @Column({ comment: '性别', default: Gender.MALE })
    gender: Gender;

    @Column({ type: 'simple-json', default: {}, comment: '扩展信息' })
    ex_info: any;

    @ManyToMany((type) => Role, (role) => role.users)
    @JoinTable()
    roles: Role[];

    @ManyToOne((type) => Organization, (org) => org.users)
    org: Organization;

    role: Role;

    static create(target: Object) {
        return plainToClass(User, target);
    }

    @Expose()
    get avatarPath(): string {
        return Base.getFullPath(this.avatar);
    }

    @Expose()
    get isSuperAdmin(): boolean {
        if (!this.roles || this.roles.length <= 0) return false;

        return !!this.roles.find((role) => role.token === 'superAdmin');
    }

    @BeforeInsert()
    async beforeInsert() {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password || '12345678', salt);
    }
}
