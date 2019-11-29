import { ConsoleService } from "@nestify/console";
import { Injectable } from "@nestjs/common";

@Injectable()
export class SeedCommand {
    constructor(private readonly cli: ConsoleService) {
        this.cli
            .getCli()
            .command('list <directory>')
            .description('List content of a directory')
            .action(this.list.bind(this));

        this.cli
            .getCli()
            .command('rm <dir>')
            .option('-r, --recursive', 'Remove recursively')
            .action(this.list.bind(this));
    }

    async list(directory: string) {
        const sp = ConsoleService.createSpinner();
        sp.start(`Listing files in directory ${directory}`);

        setTimeout(() => {
            sp.stop();
        }, 2000);
    }

    async rm(dir: string, cmdObj: any) {
        console.log('remove ' + dir + (cmdObj.recursive ? ' recursively' : ''));
    }
}