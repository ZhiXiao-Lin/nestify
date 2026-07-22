import pino from 'pino';
import { Logger, LoggerServiceImpl } from '../logger.service';
import { LoggerConfigurationError } from '../logger.types';

const mockChildLogger = createNativeLogger();
const mockNativeLogger = createNativeLogger();
mockNativeLogger.child.mockReturnValue(mockChildLogger);

jest.mock('pino', () => {
    const factory = jest.fn(() => mockNativeLogger) as jest.Mock & {
        stdTimeFunctions: { isoTime: jest.Mock };
    };
    factory.stdTimeFunctions = { isoTime: jest.fn() };
    return { __esModule: true, default: factory };
});

describe('LoggerServiceImpl', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockNativeLogger.child.mockReturnValue(mockChildLogger);
    });

    it('creates Pino with service identity and secure redaction', () => {
        const logger = new LoggerServiceImpl({
            name: 'api',
            json: true,
            base: { region: 'test' },
            redact: ['credentials.secret'],
            redactionCensor: '<hidden>',
        });

        logger.info('ready', { requestId: 'request-1' });

        expect(pino).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'info',
                name: 'api',
                base: { region: 'test', service: 'api' },
                redact: expect.objectContaining({
                    censor: '<hidden>',
                    paths: expect.arrayContaining(['password', 'credentials.secret']),
                }),
            }),
        );
        expect((pino as unknown as jest.Mock).mock.calls[0][0].transport).toBeUndefined();
        expect(mockNativeLogger.info).toHaveBeenCalledWith({ region: 'test', requestId: 'request-1' }, 'ready');
    });

    it('configures pretty output and supports explicit redaction opt-out', () => {
        new LoggerServiceImpl({ prettyPrint: true, redact: false });
        expect((pino as unknown as jest.Mock).mock.calls[0][0]).toMatchObject({
            transport: expect.objectContaining({ target: 'pino-pretty' }),
        });
        expect((pino as unknown as jest.Mock).mock.calls[0][0].redact).toBeUndefined();
    });

    it('writes structured context before the message for every level', () => {
        const logger = new LoggerServiceImpl({ json: true });

        logger.fatal('fatal', 'Service');
        logger.error('error', { requestId: 'one' });
        logger.warn('warn', 'Service');
        logger.info('info', { actorId: 'actor' });
        logger.debug('debug');
        logger.trace('trace');
        logger.verbose('verbose');
        logger.write('warn', 'written', { subjectId: 'subject' });
        logger.write('silent', 'not written');

        expect(mockNativeLogger.fatal).toHaveBeenCalledWith({ context: 'Service' }, 'fatal');
        expect(mockNativeLogger.error).toHaveBeenCalledWith({ requestId: 'one' }, 'error');
        expect(mockNativeLogger.warn).toHaveBeenCalledWith({ context: 'Service' }, 'warn');
        expect(mockNativeLogger.info).toHaveBeenCalledWith({ actorId: 'actor' }, 'info');
        expect(mockNativeLogger.debug).toHaveBeenCalledWith({}, 'debug');
        expect(mockNativeLogger.trace).toHaveBeenCalledWith({}, 'trace');
        expect(mockNativeLogger.trace).toHaveBeenCalledWith({}, 'verbose');
        expect(mockNativeLogger.warn).toHaveBeenCalledWith({ subjectId: 'subject' }, 'written');
        expect(mockNativeLogger.info).not.toHaveBeenCalledWith(expect.anything(), 'not written');
    });

    it('supports Nest and level-aware log overloads without misclassifying a lone level word', () => {
        const logger = new LoggerServiceImpl({ json: true });

        logger.log('operation complete', 'ExampleService');
        logger.log('warn', 'retrying', 'Worker');
        logger.log('error');
        logger.log('info', { requestId: 'request-1' });

        expect(mockNativeLogger.info).toHaveBeenCalledWith({ context: 'ExampleService' }, 'operation complete');
        expect(mockNativeLogger.warn).toHaveBeenCalledWith({ context: 'Worker' }, 'retrying');
        expect(mockNativeLogger.info).toHaveBeenCalledWith({}, 'error');
        expect(mockNativeLogger.info).toHaveBeenCalledWith({ requestId: 'request-1' }, 'info');
    });

    it('normalizes Error details, causes, codes, and Nest trace arguments', () => {
        const logger = new LoggerServiceImpl({ json: true });
        const error = Object.assign(new Error('boom', { cause: new Error('root cause') }), { code: 42 });

        logger.error(error, { requestId: 'request-1' });
        logger.error('message', 'stack trace', 'ExampleService');
        logger.error(new Error('string cause', { cause: 'remote' }));

        expect(mockNativeLogger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                requestId: 'request-1',
                err: expect.objectContaining({ message: 'boom', name: 'Error', cause: 'root cause', code: '42' }),
            }),
            'boom',
        );
        expect(mockNativeLogger.error).toHaveBeenCalledWith(
            { context: 'ExampleService', stack: 'stack trace' },
            'message',
        );
        expect(mockNativeLogger.error).toHaveBeenCalledWith(
            expect.objectContaining({ err: expect.objectContaining({ cause: 'remote' }) }),
            'string cause',
        );
    });

    it('isolates, nests, copies, and validates async request context', () => {
        const logger = new LoggerServiceImpl({ json: true });

        LoggerServiceImpl.runWithContext({ requestId: 'request-1', actorId: 'actor-1' }, () => {
            const exposed = LoggerServiceImpl.getRequestContext();
            exposed!.requestId = 'mutated';
            expect(LoggerServiceImpl.getRequestContext()?.requestId).toBe('request-1');

            LoggerServiceImpl.runWithContext({ correlationId: 'correlation-1' }, () => {
                logger.warn('slow', { statusCode: 503 });
            });

            LoggerServiceImpl.setRequestContext({ subjectId: 'subject-1' });
            expect(LoggerServiceImpl.getRequestContext()).toMatchObject({
                requestId: 'request-1',
                subjectId: 'subject-1',
            });
        });

        expect(mockNativeLogger.warn).toHaveBeenCalledWith(
            {
                requestId: 'request-1',
                actorId: 'actor-1',
                correlationId: 'correlation-1',
                statusCode: 503,
            },
            'slow',
        );
        expect(LoggerServiceImpl.getRequestContext()).toBeUndefined();
        expect(() => LoggerServiceImpl.runWithContext(null as never, () => undefined)).toThrow(TypeError);
        expect(() => LoggerServiceImpl.runWithContext({}, null as never)).toThrow(
            'context callback must be a function',
        );
        expect(() => logger.info('bad', [] as never)).toThrow('log context must be an object');
    });

    it('uses a native Pino child without constructing another transport', () => {
        const logger = new LoggerServiceImpl({ name: 'api', prettyPrint: true });
        const pinoCalls = (pino as unknown as jest.Mock).mock.calls.length;

        const child = LoggerServiceImpl.runWithContext({ requestId: 'request-1' }, () =>
            logger.child({ actorId: 'actor-1' }),
        );
        child.info('child message');

        expect(mockNativeLogger.child).toHaveBeenCalledWith({ requestId: 'request-1', actorId: 'actor-1' });
        expect(mockChildLogger.info).toHaveBeenCalledWith({}, 'child message');
        expect((pino as unknown as jest.Mock).mock.calls).toHaveLength(pinoCalls);
        expect(() => logger.child(null as never)).toThrow('child context must be an object');
    });

    it('logs successful, failed-status, and exceptional requests once with bounded duration', () => {
        const logger = new LoggerServiceImpl({ json: true });

        logger.logRequest({
            method: 'GET',
            url: '/resources',
            requestId: 'one',
            durationMs: 1.6,
            statusCode: 200,
            headers: { authorization: 'secret' },
            body: { query: 'all' },
            responseBody: { count: 1 },
            context: { route: '/resources' },
        });
        logger.logRequest({ method: 'GET', url: '/missing', startTime: Date.now() + 1_000, statusCode: 404 });
        logger.logRequest({ method: 'POST', url: '/resources', durationMs: -5, statusCode: 500, error: 'failed' });

        expect(mockNativeLogger.info).toHaveBeenCalledWith(
            expect.objectContaining({
                requestId: 'one',
                responseTime: 2,
                route: '/resources',
                requestHeaders: { authorization: 'secret' },
                requestBody: { query: 'all' },
                responseBody: { count: 1 },
            }),
            'GET /resources 200',
        );
        expect(mockNativeLogger.warn).toHaveBeenCalledWith(
            expect.objectContaining({ responseTime: 0, statusCode: 404 }),
            'GET /missing 404',
        );
        expect(mockNativeLogger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                responseTime: 0,
                statusCode: 500,
                err: expect.objectContaining({ message: 'failed' }),
            }),
            'failed',
        );
        expect(() => logger.logRequest(null as never)).toThrow('request log input must be an object');
    });

    it('falls back to info if a native level method is unexpectedly unavailable', () => {
        const logger = new LoggerServiceImpl({ json: true });
        const original = mockNativeLogger.debug;
        mockNativeLogger.debug = undefined as never;
        try {
            logger.debug('fallback', { requestId: 'one' });
            expect(mockNativeLogger.info).toHaveBeenCalledWith(
                { requestId: 'one', requestedLevel: 'debug' },
                'fallback',
            );
        } finally {
            mockNativeLogger.debug = original;
        }
    });

    it('moves caller-supplied reserved Pino fields under contextFields', () => {
        const logger = new LoggerServiceImpl({ name: 'api', json: true });
        logger.info('safe', {
            requestId: 'one',
            level: 'fatal',
            msg: 'spoofed',
            service: 'spoofed',
            contextFields: { existing: true },
        });

        expect(mockNativeLogger.info).toHaveBeenCalledWith(
            {
                requestId: 'one',
                contextFields: {
                    existing: true,
                    level: 'fatal',
                    msg: 'spoofed',
                    service: 'spoofed',
                },
            },
            'safe',
        );
    });

    it('wraps Pino construction failures as configuration errors', () => {
        (pino as unknown as jest.Mock).mockImplementationOnce(() => {
            throw new Error('transport missing');
        });
        expect(() => new LoggerServiceImpl({ json: true })).toThrow(LoggerConfigurationError);
    });

    it('keeps the Logger compatibility export as the same DI token', () => {
        expect(Logger).toBe(LoggerServiceImpl);
    });
});

function createNativeLogger(): Record<string, jest.Mock> {
    return {
        fatal: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
        child: jest.fn(),
    };
}
