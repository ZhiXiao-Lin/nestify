import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/core';
import { User } from './user.interface';

@Injectable()
export class UserRepository extends BaseRepository<User> {}
