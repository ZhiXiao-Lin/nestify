import * as _ from 'lodash';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Transaction, TransactionRepository } from 'typeorm';
import { TransformClassToPlain } from 'class-transformer';
import { BaseService } from './base.service';
import { User } from '../entities/user.entity';
import { PointsActionType, FlowTemplateEnum } from '../aspects/enum';
import { FlowService } from './flow.service';
import { wf } from '../lib/wf';
import { Role } from '../entities/role.entity';
import { Logger } from '../lib/logger';
import { Detail } from '../entities/detail.entity';
import { Organization } from '../entities/organization.entity';

@Injectable()
export class UserService extends BaseService<User> {
    constructor(
        private readonly jwtService: JwtService,
        private readonly flowService: FlowService,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Detail) private readonly detailRepository: Repository<Detail>,
        @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
        @InjectRepository(Organization) private readonly organizationRepository: Repository<Organization>,
    ) {
        super(userRepository);
    }

    @TransformClassToPlain()
    async query(payload: any) {
        const qb = this.userRepository.createQueryBuilder('t');

        qb.leftJoinAndSelect('t.role', 'role');
        qb.leftJoinAndSelect('t.org', 'organization');
        qb.leftJoinAndSelect('t.flows', 'flows');

        if (!payload.page) {
            payload.page = 0;
        }

        if (!payload.pageSize) {
            payload.pageSize = 10;
        }

        if (!!payload.keyword) {
            qb.andWhere(`t.nickname LIKE '%${payload.keyword}%'`);
        }

        if (!!payload.roleToken) {
            qb.andWhere('role.token = :role', { role: payload.roleToken });
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
    async details(payload: any) {
        const qb = this.detailRepository.createQueryBuilder('t');

        qb.leftJoinAndSelect('t.user', 'user');

        if (!payload.page) {
            payload.page = 0;
        }

        if (!payload.pageSize) {
            payload.pageSize = 10;
        }

        qb.andWhere('user.id =:id', { id: payload.userId });

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

        qb.skip(payload.page * payload.pageSize);
        qb.take(payload.pageSize);


        return await qb.getManyAndCount();
    }

    @TransformClassToPlain()
    async findOneById(id) {
        const qb = this.userRepository.createQueryBuilder('t');

        qb.andWhere('t.id = :id', { id });

        qb.leftJoinAndSelect('t.role', 'role');
        qb.leftJoinAndSelect('t.org', 'organization');
        qb.leftJoinAndSelect('t.flows', 'flows');
        qb.leftJoinAndSelect('role.authorities', 'authorities');

        return await qb.getOne();
    }

    async findOne(where) {
        const qb = this.userRepository.createQueryBuilder('t');

        if (!!where.account) {
            qb.andWhere('t.account = :account', { account: where.account });
        }

        if (!!where.wechatOpenid) {
            qb.andWhere('t.wechatOpenid = :wechatOpenid', { wechatOpenid: where.wechatOpenid });
        }

        qb.leftJoinAndSelect('t.role', 'role');
        qb.leftJoinAndSelect('t.org', 'organization');

        return await qb.getOne();
    }

    async login(account, password) {
        let user = await this.findOne({ account });
        Logger.log('Login --->', user);

        if (!user) {
            const role = await this.roleRepository.findOne({ where: { token: 'user' } });

            user = new User();
            user.account = account;
            user.password = password;
            user.role = role;

            // 用户不存在则直接注册
            user = await this.userRepository.save(user);
        } else {
            if (!(await bcrypt.compare(password, user.password)))
                throw new BadRequestException('密码错误');
        }

        const token = await this.getToken(user);
        return { token };
    }

    async getToken(user: User) {
        return await this.jwtService.sign(_.toPlainObject(user));
    }

    async changePassword(id, dto) {
        const user = await this.userRepository.findOne({ where: { id }, relations: ['role'] });

        if (!(await bcrypt.compare(dto.oldPassword, user.password)))
            throw new BadRequestException('旧密码错误');

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(dto.password, salt);

        return await this.userRepository.save(user);
    }

    @TransformClassToPlain()
    @Transaction()
    async save(
        payload: any,
        @TransactionRepository(User) userRepos?: Repository<User>,
        @TransactionRepository(Detail) detailRepos?: Repository<Detail>,
        @TransactionRepository(Role) rowRepos?: Repository<Role>
    ) {
        const user = User.create(payload) as User;

        if (!user.role) {
            // 添加默认角色
            const role = await rowRepos.findOne({ where: { token: 'user' } });
            user.role = role;
        }



        const { actionType } = payload;

        // 增加积分的逻辑
        if (!!actionType) {

            // 记录积分明细
            const detail = new Detail();
            detail.title = payload.title;
            detail.user = user;

            if (PointsActionType.ADD === actionType) {
                user.points += payload.value || 0;
                detail.value = payload.value;
            }

            if (PointsActionType.SUB === actionType) {
                user.points -= payload.value || 0;
                detail.value = -payload.value;
            }

            await detailRepos.save(detail);
        }


        return await userRepos.save(user);
    }

    async applyVolunteer(payload: any) {
        const user = await this.findOneById(payload.id);
        user.realName = payload.realName;
        user.phone = payload.phone;
        user.idCard = payload.idCard;
        user.address = payload.address;
        user.org = await this.organizationRepository.findOne(payload.org);

        await this.save(user);

        const isExist = await this.flowService.findOneByUser(user, FlowTemplateEnum.APPLY_VR);

        if (!!isExist || (!!user.status && user.status !== '已驳回')) {
            throw new BadRequestException('请勿重复申请');
        }

        const flow = await this.flowService.create(user, payload, FlowTemplateEnum.APPLY_VR);

        return wf.dispatch(flow.id, '申请');
    }
}
