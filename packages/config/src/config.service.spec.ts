import * as path from 'path';
import { ConfigService } from './config.service';
import { ConfigModule } from './config.module';

describe('Config Service', () => {
    describe('Will load configurations from given a glob', () => {
        let configService: ConfigService;
        beforeEach(async () => {
            ConfigModule.initEnvironment(__dirname + '/env');
            configService = await ConfigService.load(
                path.resolve(__dirname, 'config', '**/!(*.d).{ts,js}'),
                false,
            );
        });
        it('Will return the value from a previously loaded config', () => {
            expect(configService.get(['app', 'port'])).toEqual('7777');
        });

        it('Will return a given default value if the config path is not found', () => {
            expect(configService.get('notfound', 30000)).toEqual(30000);
        });
    });
});