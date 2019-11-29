import { Injectable } from '@nestjs/common';
import { Command as Cli } from 'commander';
import * as ora from 'ora';
import * as inquirer from 'inquirer';
import { InjectCommander } from './console.decorators';

@Injectable()
export class ConsoleService {
    constructor(
        @InjectCommander()
        private readonly cli: Cli
    ) { }

    static createSpinner(text: string = 'loading'): ora.Ora {
        return ora(text);
    }

    static createInquirer(): inquirer.Inquirer {
        return inquirer;
    }

    getCli() {
        return this.cli;
    }

    init(argv: string[]) {
        this.cli.on('command:*', () => {
            this.cli.help();
        });
        const args = this.cli.parse(argv) as Cli;
        if (argv.length === 2) {
            this.cli.help();
        }

        return args;
    }

    exit() {
        process.exit(0);
    }
}
