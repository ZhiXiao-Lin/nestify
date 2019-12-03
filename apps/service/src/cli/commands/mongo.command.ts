import { ConsoleService } from '@nestify/console';
import { Injectable } from '@nestjs/common';
import { AdminModelName } from '../../bll/user';
import { SeederService } from '../../seeder';

@Injectable()
export class MongoCommand {
    constructor(
        private readonly cli: ConsoleService,
        private readonly seedService: SeederService
    ) {
        this.cli
            .getCli()
            .command('seed')
            .description('Run all database seed files.')
            .action(this.seed.bind(this));
    }

    async seed() {
        try {
            const sp = ConsoleService.createSpinner();
            sp.start('Start scanning database seed files...');

            const models = [AdminModelName];

            for (const name of models) {
                sp.info(`Generated seed for ${name}`);
                const model = this.seedService.Seeders.find(m => m.modelName === name);
                await model.seed();
            }

            sp.succeed('Run successfully');
            sp.stop();
        } catch (err) {
            console.error(err);
        } finally {
            this.cli.exit();
        }
    }
}
