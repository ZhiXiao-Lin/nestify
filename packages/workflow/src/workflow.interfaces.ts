import { LoggerService } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import { EventEmitter } from 'events';
import { TaskStatus } from './workflow.enums';

export interface ITaskPredicate {
    apply(result: ITaskResult): Promise<boolean>;
}

export interface ITaskResult {
    getStatus(): TaskStatus;
}

export interface ITask {
    Name: string;
    call(): Promise<ITaskResult>;
}

export interface IWorkFlow extends ITask {}

export interface IWorkFlowEngine {
    run(workflow: IWorkFlow): Promise<ITaskResult>;
}

export interface WorkFlowModuleOptions {
    logger?: LoggerService;
    event: EventEmitter;
    eventPrefix: string;
}

export interface WorkFlowModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useFactory: (...args: any[]) => Promise<WorkFlowModuleOptions> | WorkFlowModuleOptions;
    inject?: any[];
}
