import { BaseSchema } from '../../common/core';

export const UserSchema = BaseSchema({
    account: {
        type: String,
        index: true,
        unique: true,
        required: true,
        trim: true
    },
    password: { type: String, required: true, trim: true }
});

export const UserModelName = 'User';

export const UserModel = {
    name: UserModelName,
    schema: UserSchema
};
