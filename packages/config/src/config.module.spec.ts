import { Test, TestingModule } from '@nestjs/testing';
import * as path from 'path';
import { ConfigModule, ConfigService } from './index';

describe('Config Nest Module', () => {

    beforeEach(() => {
        ConfigModule.initEnvironment();
    });

    it('Will boot nest-config module succesfully', async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.register(path.resolve(__dirname, 'config', '**/!(*.d).{ts,js}')),
            ],
        }).compile();

        const configService = module.get<ConfigService>(ConfigService);

        expect(configService).toBeDefined();
        expect(configService.get('app.env')).toEqual('test');
        expect(configService.get('app.port')).toEqual('7777');
    });
});
