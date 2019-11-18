import { LoggerService } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import { EventEmitter } from 'events';

export interface RuleDecoratorOptions {
    name: string | symbol;
    description: string;
    priority: number;
}

export interface ConditionDecoratorOptions {}

export interface ActionDecoratorOptions {
    order: number;
}

export interface FactDecoratorOptions {}

export interface RuleEngineModuleOptions {
    logger?: LoggerService;
    event: EventEmitter;
    eventPrefix: string;
}

export interface RuleEngineModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useFactory: (...args: any[]) => Promise<RuleEngineModuleOptions> | RuleEngineModuleOptions;
    inject?: any[];
}
