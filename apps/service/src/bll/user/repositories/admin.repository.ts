import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Repository } from '../../../common/core';
import { Admin, AdminModelName } from '../models';
import { BaseUserRepository } from './base-user.repository';

@Repository()
export class AdminRepository extends BaseUserRepository<Admin> {
    constructor(
        @InjectModel(AdminModelName)
        protected readonly model: Model<Admin>
    ) {
        super(model);
    }
}
