import { ConsoleService } from '../console.service';
export declare class Command {
    private readonly cli;
    constructor(cli: ConsoleService);
    list(directory: string): Promise<void>;
    rm(dir: string, cmdObj: any): Promise<void>;
}
