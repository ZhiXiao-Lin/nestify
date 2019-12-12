import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import * as Arena from 'bull-arena';
import { ARENA_OPTIONS } from './arena.constants';
import { ArenaModuleOptions } from './arena.interfaces';

@Injectable()
export class ArenaService implements OnModuleInit {
    constructor(
        @Inject(ARENA_OPTIONS)
        private readonly options: ArenaModuleOptions,
        private readonly adapterHost: HttpAdapterHost
    ) { }

    async onModuleInit() {
        if (this.adapterHost.httpAdapter) {
            this.adapterHost.httpAdapter.getInstance().use(Arena({ queues: this.options.queues }, this.options.listenOptions));
        }
    }
}
