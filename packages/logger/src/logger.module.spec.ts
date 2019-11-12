import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from 'winston';
import { LOGGER_MODULE_PROVIDER } from './logger.constants';
import { LoggerModule } from './logger.module';

describe('Logger Module', () => {
    let logger: Logger;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [LoggerModule.register({})]
        }).compile();

        logger = module.get(LOGGER_MODULE_PROVIDER);
    });

    it('Will boot logger module succesfully', async () => {
        expect(logger).toBeDefined();
    });
});

describe('Logger Module', () => {
    it('Will boot logger module succesfully', async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [LoggerModule.register({})]
        }).compile();

        const logger = module.get(LOGGER_MODULE_PROVIDER);
        expect(logger).toBeDefined();
    });

    it('Will boot logger module succesfully async', async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                LoggerModule.registerAsync({
                    useFactory: async () => {
                        return {};
                    }
                })
            ]
        }).compile();

        const logger = module.get(LOGGER_MODULE_PROVIDER);
        expect(logger).toBeDefined();
    });
});
