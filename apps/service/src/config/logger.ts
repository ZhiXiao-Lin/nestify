import { LoggerLevel, LoggerService } from '@nestify/logger';
import { transports } from 'winston';

export default {
    level: LoggerLevel.SILLY,
    format: LoggerService.createFormat(),
    transports: [new transports.Console()]
};
