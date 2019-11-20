import { ITaskResult, IWorkFlow, IWorkFlowEngine } from "../workflow.interfaces";

export class WorkFlowEngineBuilder {
    public static newWorkFlow(): WorkFlowEngineBuilder {
        return new WorkFlowEngineBuilder();
    }

    public build() {
        return new WorkFlowEngine();
    }
}

export class WorkFlowEngine implements IWorkFlowEngine {

    async run(workflow: IWorkFlow): Promise<ITaskResult> {
        return await workflow.call();
    }
}