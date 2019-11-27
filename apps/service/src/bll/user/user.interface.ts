import { IModel } from '../../common/core';

export interface User extends IModel {
    readonly account: string;
    readonly password: string;
}
