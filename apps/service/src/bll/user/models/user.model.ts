import { BaseSchema } from '../../../common/core';
import { BaseUserModel, BaseUserSchema } from './base-user.model';

export interface User extends BaseUserModel { }

const schema = BaseSchema({
    ...BaseUserSchema
});

export const UserModelName = 'User';
export const UserModel = {
    name: UserModelName, schema
};
