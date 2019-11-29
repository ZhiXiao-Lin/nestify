import { ConsoleService } from "@nestify/console";
import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

@Injectable()
export class MongoCommand {
    constructor(
        private readonly cli: ConsoleService,
        @InjectConnection()
        private readonly db: Connection
    ) {
        this.cli
            .getCli()
            .command('seed')
            .description('Run all database seed files.')
            .action(this.seed.bind(this));

        this.cli
            .getCli()
            .command('drop')
            .description('Deletes the given database, including all collections, documents, and indexes.')
            .action(this.drop.bind(this));
    }

    async seed() {
        const sp = ConsoleService.createSpinner();
        sp.start('Start scanning database seed files...');

        console.log(this.db.models);

        sp.stop();
        this.cli.exit();
    }

    async drop() {
        const sp = ConsoleService.createSpinner();
        sp.start('Dropping database...');

        await this.db.dropDatabase();

        sp.stop();
        this.cli.exit();
    }
}