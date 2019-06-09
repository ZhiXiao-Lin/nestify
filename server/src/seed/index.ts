import { resolve } from 'path';
import { Injectable } from '@nestjs/common';
import { User } from '../common/entities/user.entity';
import { Category } from '../common/entities/category.entity';
import { Setting } from '../common/entities/setting.entity';
import { ExcelHelper } from '../common/lib/excel';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { Logger } from '../common/lib/logger';
import { es } from '../common/lib/elastic-search';
import { Organization } from '../common/entities/organization.entity';
import { Role } from '../common/entities/role.entity';
import { Authority } from '../common/entities/authority.entity';
import { Content } from '../common/entities/content.entity';

@Injectable()
export class Seed {
    constructor(@InjectConnection() private readonly connection: Connection) {}

    async start() {
        Logger.log('seed start');

        await this.initElasticSearchIndices();

        await this.connection.getRepository(Setting).save({
            token: 'default',
            ex_info: await ExcelHelper.loadFromFile(
                resolve('./seeds/settings.xlsx'),
                Setting.sheetsMap
            )
        });

        await this.importCategorys();
        await this.importOrganizations();
        await this.importAuthoritys();
        await this.importRoles();

        const roleAdmin = await this.connection
            .getRepository(Role)
            .findOne({ token: 'superAdmin' });

        const superAdmin = User.create({
            account: 'SysAdmin',
            password: '12345678',
            nickname: '超级管理员',
            avatar: '/images/superadmin.png'
        });
        superAdmin.roles = [roleAdmin];
        superAdmin.org = await this.connection
            .getRepository(Organization)
            .findOne({ name: '股东会' });

        await this.connection.getRepository(User).save(superAdmin);

        // 查询拥有超级管理员角色的用户
        const users = await this.connection
            .createQueryBuilder(User, 'user')
            .leftJoinAndSelect('user.org', 'organization')
            .leftJoinAndMapOne('user.role', 'user.roles', 'role', 'role.token = :token', {
                token: 'superAdmin'
            })
            .getManyAndCount();

        Logger.log(users);
    }

    async initElasticSearchIndices() {
        if (await es.indices.exists({ index: 'uploads' })) {
            await es.indices.delete({ index: 'uploads' });
        }

        await es.indices.create({
            index: 'uploads',
            body: {
                type: 'uploads',
                mappings: {
                    file: {
                        properties: {
                            baseName: {
                                type: 'text',
                                analyzer: 'ik_max_word',
                                search_analyzer: 'ik_max_word'
                            },
                            dirName: {
                                type: 'text',
                                analyzer: 'ik_max_word',
                                search_analyzer: 'ik_max_word'
                            },
                            extName: {
                                type: 'text',
                                analyzer: 'ik_max_word',
                                search_analyzer: 'ik_max_word'
                            },
                            path: {
                                type: 'text',
                                analyzer: 'ik_max_word',
                                search_analyzer: 'ik_max_word'
                            },
                            type: {
                                type: 'string'
                            },
                            // https://nodejs.org/api/fs.html#fs_stats_dev
                            stat: {
                                type: 'object'
                            }
                        }
                    }
                }
            }
        });

        if (await es.indices.exists({ index: Content.esIndex.index })) {
            await es.indices.delete({ index: Content.esIndex.index });
        }

        await es.indices.create(Content.esIndex);
    }

    async importCategorys() {
        const categorysResult = await ExcelHelper.loadFromFile(
            resolve('./seeds/categorys.xlsx'),
            Category.sheetsMap
        );
        const categorys = categorysResult['categorys'];
        const categoryArr = [];

        categorys.forEach((item) => {
            if (!!item.parent) {
                item.parent = categoryArr.find((cate) => cate.id === item.parent);
            }
            categoryArr.push(Category.create(item));
        });
        await this.connection.getTreeRepository(Category).save(categoryArr);
    }

    async importOrganizations() {
        const organizationsResult = await ExcelHelper.loadFromFile(
            resolve('./seeds/organizations.xlsx'),
            Organization.sheetsMap
        );
        const organizations = organizationsResult['organizations'];
        const organizationArr = [];

        organizations.forEach((item) => {
            if (!!item.parent) {
                item.parent = organizationArr.find((org) => org.id === item.parent);
            }
            organizationArr.push(Organization.create(item));
        });
        await this.connection.getTreeRepository(Organization).save(organizationArr);
    }

    async importAuthoritys() {
        const result = await ExcelHelper.loadFromFile(
            resolve('./seeds/authoritys.xlsx'),
            Authority.sheetsMap
        );
        const athoritys = result['authoritys'];
        const arr = [];

        for (let item of athoritys) {
            if (!!item.parent) {
                item.parent = arr.find((auth) => auth.id === item.parent);
            }
            arr.push(Authority.create(item));
        }

        await this.connection.getRepository(Authority).save(arr);
    }

    async importRoles() {
        const rolesResult = await ExcelHelper.loadFromFile(
            resolve('./seeds/roles.xlsx'),
            Role.sheetsMap
        );
        const roles = rolesResult['roles'];
        const rolesArr = [];

        for (let item of roles) {
            rolesArr.push(Role.create(item));
        }

        await this.connection.getRepository(Role).save(rolesArr);
    }
}
