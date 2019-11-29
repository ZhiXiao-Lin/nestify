import { Command } from 'commander';
import { CONSOLE_COMMANDER_PROVIDER } from './console.constants';

export const CommanderProvider = {
    provide: CONSOLE_COMMANDER_PROVIDER,
    useValue: new Command()
};
