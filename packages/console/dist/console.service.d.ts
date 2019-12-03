import { Command as Cli } from 'commander';
import * as ora from 'ora';
import * as inquirer from 'inquirer';
export declare class ConsoleService {
    private readonly cli;
    constructor(cli: Cli);
    static createSpinner(text?: string): ora.Ora;
    static createInquirer(): inquirer.Inquirer;
    getCli(): Cli;
    init(argv: string[]): any;
    exit(): void;
}
