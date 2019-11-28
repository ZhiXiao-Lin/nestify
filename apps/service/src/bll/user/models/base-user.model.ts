import { IModel } from "../../../common/core";

export const BaseUserSchema = {
    account: {
        type: String,
        index: true,
        unique: true,
        required: true,
        trim: true
    },
    password: { type: String, required: true, trim: true },
    nickname: { type: String, trim: true },
    avatar: { type: String, trim: true },
};

export interface BaseUserModel extends IModel {
    readonly account: string;
    readonly password: string;
    readonly nickname: string;
    readonly avatar: string;
}