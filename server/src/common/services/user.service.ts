import * as _ from 'lodash';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransformClassToPlain } from 'class-transformer';
import { BaseService } from './base.service';
import { User } from '../entities/user.entity';

@Injectable()
export class UserService extends BaseService<User> {
    constructor(
        private readonly jwtService: JwtService,
        @InjectRepository(User) private readonly userRepository: Repository<User>
    ) {
        super(userRepository);
    }

    @TransformClassToPlain()
    async query(payload: any) {
        const qb = this.userRepository.createQueryBuilder('t');

        qb.leftJoinAndSelect('t.roles', 'role');
        qb.leftJoinAndSelect('t.org', 'organization');

        if (!payload.page) {
            payload.page = 0;
        }

        if (!payload.pageSize) {
            payload.pageSize = 10;
        }

        if (!!payload.keyword) {
            qb.andWhere(`t.nickname LIKE '%${payload.keyword}%'`);
        }

        if (!!payload.org) {
            qb.andWhere('organization.id = :org', { org: payload.org });
        }

        if (!!payload.create_at) {
            payload.create_at = payload.create_at.split(',');
            qb.andWhere(
                `t.create_at BETWEEN '${payload.create_at.shift()}' AND '${payload.create_at.pop()}'`
            );
        }

        if (!!payload.sort && !!payload.order) {
            qb.addOrderBy(`t.${payload.sort}`, payload.order);
        } else {
            qb.addOrderBy('t.create_at', 'DESC');
        }

        if (!!payload.isExport) {
            if (!payload.category) throw new BadRequestException('分类参数错误');

            const dataSource = await qb.getMany();

            // 执行导出逻辑
            // return await ExcelHelper.export(dataSource, Content.sheetsMap[payload.category], payload.fields.split(','));
        } else {
            qb.skip(payload.page * payload.pageSize);
            qb.take(payload.pageSize);
        }

        return await qb.getManyAndCount();
    }

    @TransformClassToPlain()
    async findOneById(id) {
        return await this.userRepository.findOne({
            where: { id },
            relations: ['roles', 'org']
        });
    }

    async login(account, password) {
        const user = await this.userRepository.findOne({ account });

        if (!user) throw new BadRequestException('用户不存在');

        if (!(await bcrypt.compare(password, user.password)))
            throw new BadRequestException('密码错误');

        return await this.jwtService.sign(_.toPlainObject(user));
    }

    async changePassword(id, dto) {
        const user = await this.userRepository.findOne({ where: { id }, relations: ['roles'] });

        if (!(await bcrypt.compare(dto.oldPassword, user.password)))
            throw new BadRequestException('旧密码错误');

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(dto.password, salt);

        return await this.userRepository.save(user);
    }

    @TransformClassToPlain()
    async save(payload: any) {
        const user = User.create(payload) as User;

        return await this.userRepository.save(user);
    }

    // async remove(ids: string[]) {
    //     // 软删除
    //     return await this.userRepository.delete(ids);
    // }
}
