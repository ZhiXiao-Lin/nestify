import { Logger, LoggerService } from '@nestjs/common';
import { EventEmitter } from 'events';
import { WORK_FLOW_EVENT_PREFIX } from '../workflow.constants';
import { ITaskResult, IWorkFlow, IWorkFlowEngine } from '../workflow.interfaces';

export class WorkFlowEngineBuilder {
    private _logger: LoggerService;
    private _event: EventEmitter;
    private _prefix: string = WORK_FLOW_EVENT_PREFIX;

    public static newWorkFlow(): WorkFlowEngineBuilder {
        return new WorkFlowEngineBuilder();
    }

    public prefix(prefix: string) {
        this._prefix = prefix;
        return this;
    }

    public event(event: EventEmitter) {
        this._event = event;
        return this;
    }

    public logger(logger: LoggerService) {
        this._logger = logger;
        return this;
    }

    public build() {
        return new WorkFlowEngine(this._prefix, this._event, this._logger);
    }
}

export class WorkFlowEngine implements IWorkFlowEngine {
    constructor(
        private readonly eventPrefix: string = WORK_FLOW_EVENT_PREFIX,
        private readonly event: EventEmitter = new EventEmitter(),
        private readonly logger: LoggerService = new Logger(WorkFlowEngine.name)
    ) {}

    async run(workflow: IWorkFlow): Promise<ITaskResult> {
        this.logger.debug(`${workflow.Name} before running`);

        this.event.emit(`${this.eventPrefix}:${workflow.Name}:before`, workflow);

        const result = await workflow.call();

        this.event.emit(`${this.eventPrefix}:${workflow.Name}:after`, workflow, result);

        this.logger.debug(`${workflow.Name} after running`);

        return result;
    }
}
