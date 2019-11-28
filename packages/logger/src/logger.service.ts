import { ILoggerService } from '@nestify/core';
import { Inject, Injectable } from '@nestjs/common';
import * as chalk from 'chalk';
import * as _ from 'lodash';
import * as moment from 'moment';
import * as path from 'path';
import * as StackTrace from 'stacktrace-js';
import { SPLAT } from 'triple-beam';
import * as util from 'util';
import { format, Logger } from 'winston';
import { LOGGER_MODULE_PROVIDER } from './logger.constants';
import { LoggerLevel } from './logger.enums';

@Injectable()
export class LoggerService implements ILoggerService {
    constructor(
        @Inject(LOGGER_MODULE_PROVIDER)
        private readonly logger: Logger
    ) {}

    public error(...messages: any[]): any {
        return this.logger.error(messages.map((item) => (util.isString(item) ? item : util.inspect(item))).join(' '), this.getStackTrace());
    }

    public warn(...messages: any[]): any {
        return this.logger.warn(messages.map((item) => (util.isString(item) ? item : util.inspect(item))).join(' '), this.getStackTrace());
    }

    public info(...messages: any[]): any {
        return this.logger.info(messages.map((item) => (util.isString(item) ? item : util.inspect(item))).join(' '), this.getStackTrace());
    }

    public verbose(...messages: any[]): any {
        return this.logger.verbose(
            messages.map((item) => (util.isString(item) ? item : util.inspect(item))).join(' '),
            this.getStackTrace()
        );
    }

    public debug(...messages: any[]): any {
        return this.logger.debug(messages.map((item) => (util.isString(item) ? item : util.inspect(item))).join(' '), this.getStackTrace());
    }

    public silly(...messages: any[]): any {
        return this.logger.silly(messages.map((item) => (util.isString(item) ? item : util.inspect(item))).join(' '), this.getStackTrace());
    }

    private getStackTrace(context?: string, depth: number = 2) {
        const stackList = StackTrace.getSync();
        const stackInfo = stackList[depth];

        const fileName = stackInfo.fileName;

        const extnameLength = path.extname(fileName).length;
        let basename = path.basename(fileName);
        basename = basename.substr(0, basename.length - extnameLength);

        context = context || _.upperFirst(_.camelCase(basename));

        return { ...stackInfo, context, fileName };
    }

    public static createFormat(label: string = 'Nest') {
        return format.combine(
            format.label({ label }),
            format.timestamp(),
            format.printf((data) => {
                const { level, message, label, timestamp } = data;

                const { context } = data[SPLAT][0] || LoggerService.name;
                const timestampOutput = moment(timestamp).format('YYYY-MM-DD HH:mm:ss');
                const contextOutput = context ? chalk.yellow(`[${context}]`) : '';

                let colorRender = (str) => str;

                switch (level) {
                    case LoggerLevel.ERROR:
                        colorRender = chalk.bold.red;
                        break;
                    case LoggerLevel.WARN:
                        colorRender = chalk.bold.yellowBright;
                        break;
                    case LoggerLevel.VERBOSE:
                        colorRender = chalk.italic.visible;
                        break;
                    case LoggerLevel.DEBUG:
                        colorRender = chalk.bold.cyan;
                        break;
                    case LoggerLevel.SILLY:
                        colorRender = chalk.whiteBright;
                        break;
                    default:
                        colorRender = chalk.bold.green;
                        break;
                }

                const dataOutput = colorRender(util.isObject(message) ? util.inspect(message, false, 3, true) : message);
                const levelOutput = chalk.bold(`[${level}]`);

                return `${chalk.green(`[${label}] ${process.pid}   -`)} ${timestampOutput}   ${contextOutput} ${levelOutput} ${dataOutput}`;
            })
        );
    }
}
