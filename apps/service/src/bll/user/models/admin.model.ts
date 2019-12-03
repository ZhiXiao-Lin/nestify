import { BaseSchema } from '../../../common/core';
import { BaseUserModel, BaseUserSchema } from './base-user.model';

export interface Admin extends BaseUserModel { }

const schema = BaseSchema({
    ...BaseUserSchema
});

export const AdminModelName = 'Admin';
export const AdminModel = {
    name: AdminModelName,
    schema
};
