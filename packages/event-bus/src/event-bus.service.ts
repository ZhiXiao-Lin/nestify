import { Injectable, Logger } from '@nestjs/common';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import * as EventEmitter from 'events';
import { EVENT_BUS_ERROR } from './event-bus.constants';
import { InjectEventBusModuleOptions } from './event-bus.decorators';
import { EventBusExplorer } from './event-bus.explorer';
import { Callback, EventBusModuleOptions, ListenerDecoratorOptions } from './event-bus.interfaces';

@Injectable()
export class EventBusService {
    private readonly event: EventEmitter = new EventEmitter();
    private readonly explorer: EventBusExplorer;

    private middleware: Callback[] = [];

    private fnMiddleware: Callback = (data) => new Promise((resolve, reject) => resolve(data));

    constructor(
        @InjectEventBusModuleOptions()
        private readonly options: EventBusModuleOptions,
        private readonly modulesContainer: ModulesContainer,
        private readonly reflector: Reflector
    ) {
        this.explorer = new EventBusExplorer(this.modulesContainer, this.reflector, this.handleListener.bind(this));
        this.explorer.explore();

        if (!!this.options) {
            if (!!this.options.middleware) {
                this.options.middleware.forEach((fn) => this.use(fn));
                // this.fnMiddleware = compose(this.middleware);
            }
        }
    }

    public use(fn: Callback) {
        this.middleware.push(fn);
        return this;
    }

    public emit(eventName: string | symbol, data?: any) {
        // console.log('fnMiddleware', this.fnMiddleware);

        if (this.fnMiddleware.length <= 0) {
            return this.event.emit(eventName, data);
        }

        return this.fnMiddleware(data)
            .then((data) => this.event.emit(eventName, data))
            .catch((err) => this.event.emit(EVENT_BUS_ERROR, err));
    }

    public on(eventName: string | symbol, callback: Callback) {
        this.event.on(eventName, callback);
        return this;
    }

    public once(eventName: string | symbol, callback: Callback) {
        this.event.once(eventName, callback);
        return this;
    }

    private async handleListener({ instance, name }: InstanceWrapper, key: string, options: ListenerDecoratorOptions) {
        await this.on(options.event, instance[key].bind(instance));
        Logger.log(`Event ${options.event} is listened to by ${name}:${key}`, EventBusService.name);
    }
}
