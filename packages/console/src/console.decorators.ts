import { Inject } from '@nestjs/common';
import { CONSOLE_COMMANDER_PROVIDER } from './console.constants';

export const InjectCommander = (): ParameterDecorator => Inject(CONSOLE_COMMANDER_PROVIDER);
