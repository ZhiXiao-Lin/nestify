const { transports } = require('winston');
const { LoggerService, LoggerLevel } = require('@nestify/logger');

module.exports = {
    level: LoggerLevel.SILLY,
    format: LoggerService.createFormat(),
    transports: [new transports.Console()]
}