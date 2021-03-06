import { Body, Delete, Get, Post, Put, Query } from '@nestjs/common';
import { BaseInjectable } from './core.injectable';
import { IModel, IService } from './core.interfaces';

export abstract class BaseController<T extends IModel> extends BaseInjectable {
    constructor(protected readonly service: IService<T>) {
        super();
    }

    @Get()
    async query(@Query() payload: any): Promise<T[]> {
        return await this.service.query(payload.conditions);
    }

    @Post()
    async create(@Body() payload: any): Promise<T> {
        return await this.service.create(payload.doc);
    }

    @Put()
    async update(@Body() payload: any): Promise<T> {
        return await this.service.update(payload.conditions, payload.doc);
    }

    @Delete()
    async remove(@Query() payload: any): Promise<T> {
        return await this.service.remove(payload.conditions);
    }
}
