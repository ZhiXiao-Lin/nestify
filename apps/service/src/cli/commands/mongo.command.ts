import { ConsoleService } from '@nestify/console';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AdminModelName } from '../../bll/user';
import { SeederService } from '../../seeder';

@Injectable()
export class MongoCommand {
    constructor(
        private readonly cli: ConsoleService,
        private readonly seedService: SeederService,
        @InjectConnection()
        private readonly db: Connection
    ) {
        this.cli
            .getCli()
            .command('seed')
            .description('Run all database seed files.')
            .action(this.seed.bind(this));
    }

    async seed() {
        const sp = ConsoleService.createSpinner();
        sp.start('Start scanning database seed files...');

        const models = [AdminModelName];

        models.forEach(async name => {
            const model = this.seedService.Seeders.find(m => m.modelName === name);
            await model.seed();
        });

        sp.succeed('Run successfully');
        sp.stop();
        this.cli.exit();
    }
}
