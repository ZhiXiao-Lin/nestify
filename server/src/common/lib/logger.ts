import * as _ from 'lodash';
import * as Path from 'path';
import * as Log4js from 'log4js';
import * as Util from 'util';
import * as Moment from 'moment';
import * as StackTrace from 'stacktrace-js';
import Chalk from 'chalk';

export enum LoggerLevel {
    ALL = 'ALL',
    MARK = 'MARK',
    TRACE = 'TRACE',
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    FATAL = 'FATAL',
    OFF = 'OFF'
}

export class ContextTrace {
    constructor(
        public readonly context: string,
        public readonly path?: string,
        public readonly lineNumber?: number,
        public readonly columnNumber?: number
    ) { }
}

Log4js.addLayout('Nestify', (logConfig: any) => {
    return (logEvent: Log4js.LoggingEvent): string => {
        let moduleName: string = '';
        let position: string = '';

        const messageList: string[] = [];
        logEvent.data.forEach((value: any) => {
            if (value instanceof ContextTrace) {
                moduleName = value.context;
                if (value.lineNumber && value.columnNumber) {
                    position = `${value.lineNumber}, ${value.columnNumber}`;
                }
                return;
            }

            if (typeof value !== 'string') {
                value = Util.inspect(value, false, 3, true);
            }

            messageList.push(value);
        });

        const messageOutput: string = messageList.join(' ');
        const positionOutput: string = position ? ` [${position}]` : '';
        const typeOutput: string = `[${logConfig.type}] ${logEvent.pid.toString()}   - `;
        const dateOutput: string = `${Moment(logEvent.startTime).format('YYYY-MM-DD HH:mm:ss')}`;
        const moduleOutput: string = moduleName ? `[${moduleName}] ` : '[LoggerService] ';
        let levelOutput: string = `[${logEvent.level}] ${messageOutput}`;

        switch (logEvent.level.toString()) {
            case LoggerLevel.DEBUG:
                levelOutput = Chalk.green(levelOutput);
                break;
            case LoggerLevel.INFO:
                levelOutput = Chalk.cyan(levelOutput);
                break;
            case LoggerLevel.WARN:
                levelOutput = Chalk.yellow(levelOutput);
                break;
            case LoggerLevel.ERROR:
                levelOutput = Chalk.red(levelOutput);
                break;
            case LoggerLevel.FATAL:
                levelOutput = Chalk.hex('#DD4C35')(levelOutput);
                break;
            default:
                levelOutput = Chalk.grey(levelOutput);
                break;
        }

        return `${Chalk.green(typeOutput)}${dateOutput}    ${Chalk.yellow(
            moduleOutput
        )}${levelOutput}${positionOutput}`;
    };
});

Log4js.configure({
    appenders: {
        console: {
            type: 'stdout',
            layout: { type: 'Nestify' }
        }
    },
    categories: {
        default: {
            appenders: ['console'],
            level: 'debug'
        }
    }
});

const logger = Log4js.getLogger();
logger.level = LoggerLevel.TRACE;

export class Logger {
    static trace(...args) {
        logger.trace(Logger.getStackTrace(), ...args);
    }

    static debug(...args) {
        logger.debug(Logger.getStackTrace(), ...args);
    }

    static log(...args) {
        logger.info(Logger.getStackTrace(), ...args);
    }

    static info(...args) {
        logger.info(Logger.getStackTrace(), ...args);
    }

    static warn(...args) {
        logger.warn(Logger.getStackTrace(), ...args);
    }

    static warning(...args) {
        logger.warn(Logger.getStackTrace(), ...args);
    }

    static error(...args) {
        logger.error(Logger.getStackTrace(), ...args);
    }

    static fatal(...args) {
        logger.fatal(Logger.getStackTrace(), ...args);
    }

    static getStackTrace(deep: number = 2): ContextTrace {
        const stackList: StackTrace.StackFrame[] = StackTrace.getSync();
        const stackInfo: StackTrace.StackFrame = stackList[deep];

        const lineNumber: number = stackInfo.lineNumber;
        const columnNumber: number = stackInfo.columnNumber;
        const fileName: string = stackInfo.fileName;

        const extnameLength: number = Path.extname(fileName).length;
        let basename: string = Path.basename(fileName);
        basename = basename.substr(0, basename.length - extnameLength);
        const context: string = _.upperFirst(_.camelCase(basename));

        return new ContextTrace(context, fileName, lineNumber, columnNumber);
    }

    trace(...args) {
        logger.trace(Logger.getStackTrace(), ...args);
    }

    debug(...args) {
        logger.debug(Logger.getStackTrace(), ...args);
    }

    log(...args) {
        logger.info(Logger.getStackTrace(), ...args);
    }

    info(...args) {
        logger.info(Logger.getStackTrace(), ...args);
    }

    warn(...args) {
        logger.warn(Logger.getStackTrace(), ...args);
    }

    warning(...args) {
        logger.warn(Logger.getStackTrace(), ...args);
    }

    error(...args) {
        logger.error(Logger.getStackTrace(), ...args);
    }

    fatal(...args) {
        logger.fatal(Logger.getStackTrace(), ...args);
    }
}
