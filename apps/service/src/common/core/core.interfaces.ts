import { Document } from 'mongoose';

export interface IModel extends Document {
    readonly isDeleted: boolean;
    readonly createAt: Date;
    readonly updateAt: Date;
}

export interface IRepository<T extends IModel> {
    query(conditions: any): Promise<T[]>;
    create(doc: T): Promise<T>;
    update(conditions: any, doc: Partial<T>): Promise<T>;
    remove(conditions: any): Promise<T | any>;
}

export interface IService<T extends IModel> {
    query(conditions: any): Promise<T[]>;
    create(doc: T): Promise<T>;
    update(conditions: any, doc: Partial<T>): Promise<T>;
    remove(conditions: any): Promise<T>;
}