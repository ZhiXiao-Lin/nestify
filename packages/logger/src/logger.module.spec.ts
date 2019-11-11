import { Test, TestingModule } from '@nestjs/testing';
import { LOGGER_MODULE_PROVIDER } from './logger.constants';
import { LoggerModule } from './logger.module';
import { Logger } from 'winston';

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
