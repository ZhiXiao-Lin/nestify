import { ConsoleService } from '@nestify/console';
import { Injectable } from '@nestjs/common';
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
            .version('0.1.0')
            .arguments('[models...]')
            .description('Run all database seed files.')
            .action(this.seed.bind(this));
    }

    async seed(models: string[]) {
        const sp = ConsoleService.createSpinner();
        sp.start('Start scanning database seed files...');
        try {
            if (models.length > 0) {
                for (const model of models) {
                    sp.info(`Generated seed for ${model}`);
                    const seeder = this.seedService.Seeders.find(m => m.modelName === model);
                    await seeder.seed();
                }
            } else {
                for (const seeder of this.seedService.Seeders) {
                    sp.info(`Generated seed for ${seeder.modelName}`);
                    await seeder.seed();
                }
            }
            sp.succeed('Run successfully');
        } catch (err) {
            sp.fail('Failed to run');
            console.error(err);
        } finally {
            sp.stop();
            this.cli.exit();
        }
    }
}
