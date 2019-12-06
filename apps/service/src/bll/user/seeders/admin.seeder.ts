import { ISeeder, Seeder } from '@nestify/mongo-seeder';
import * as faker from 'faker';
import { AdminModelName } from '../models';
import { AdminService } from '../services';

@Seeder()
export class AdminSeeder implements ISeeder {
    public modelName: string = AdminModelName;
    public sort: number = 1;

    constructor(private readonly service: AdminService) { }

    async seed() {
        await this.service.create({
            account: 'admin',
            password: await this.service.encrypt('12345678'),
            nickname: faker.internet.userName(),
            avatar: faker.internet.avatar()
        });
    }
}
