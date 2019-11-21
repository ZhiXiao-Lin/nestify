import { Inject } from '@nestjs/common';
import { WORK_FLOW_OPTIONS } from './workflow.constants';

export const InjectWorkFlowModuleOptions = (): ParameterDecorator => Inject(WORK_FLOW_OPTIONS);
