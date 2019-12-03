import { ConsoleService } from '@nestify/console';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { SeederService } from '../../seeder';

@Injectable()
export class MongoCommand {
    constructor(
        private readonly cli: ConsoleService,
        private readonly seedService: SeederService,
        @InjectConnection()
        private readonly connection: Connection
    ) {
        this.cli
            .getCli()
            .version('0.1.0')
            .command('seed')
            .arguments('[models...]')
            .option('-d, --drop', 'Drop database')
            .description('Run all database seed files.')
            .action(this.seed.bind(this));
    }

    async seed(models: string[], cmd: any) {
        const sp = ConsoleService.createSpinner();
        try {

            if (!!cmd.drop) {
                sp.start('Start dropping database...');
                this.connection.dropDatabase();
                sp.info('Database dropped');
            }

            sp.start('Start scanning database seed files...');
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
