import { Test, TestingModule } from '@nestjs/testing';
import { transports } from 'winston';
import { LOGGER_MODULE_PROVIDER } from './logger.constants';
import { LoggerLevel } from './logger.enums';
import { ILoggerService } from './logger.interfaces';
import { LoggerModule } from './logger.module';
import { LoggerService } from './logger.service';

describe('Logger Module', () => {
    it('Will boot logger module succesfully', async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                LoggerModule.register({
                    level: LoggerLevel.SILLY,
                    format: LoggerService.createFormat(),
                    transports: [new transports.Console()],
                })
            ]
        }).compile();

        const logger: ILoggerService = module.get(LoggerService);

        logger.error('error', { level: 'error' });
        logger.warn('warn', { level: 'warn' });
        logger.info('info', { level: 'info' });
        logger.verbose('verbose', { level: 'verbose' });
        logger.debug('debug', { level: 'debug' });
        logger.silly('silly', { level: 'silly' });

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
