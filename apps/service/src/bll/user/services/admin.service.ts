import { Injectable } from '@nestjs/common';
import { Admin } from '../models';
import { AdminRepository } from '../repositories';
import { BaseUserService } from './base-user.service';

@Injectable()
export class AdminService extends BaseUserService<Admin> {
    constructor(protected readonly repository: AdminRepository) {
        super(repository);
    }
}
