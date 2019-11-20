import { TaskStatus } from "./workflow.enums";

export interface ITaskResult {
    getStatus(): TaskStatus;
}

export interface ITask {
    getName(): string;

    call(): Promise<ITaskResult>;
}

export interface IWorkFlow extends ITask {

}

export interface IWorkFlowEngine {
    run(workflow: IWorkFlow): Promise<ITaskResult>;
}