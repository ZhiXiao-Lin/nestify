import { Logger, LoggerServiceImpl } from '../logger.service';
import { LoggerModule } from '../logger.module';

const loggerMock = {
    fatal: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    silent: jest.fn(),
};

jest.mock('pino', () => {
    const pino = jest.fn(() => loggerMock) as jest.Mock & { stdTimeFunctions: { isoTime: jest.Mock } };
    pino.stdTimeFunctions = { isoTime: jest.fn() };

    return {
        __esModule: true,
        default: pino,
        stdTimeFunctions: pino.stdTimeFunctions,
    };
});

describe('logger package', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('creates a structured logger and respects explicit JSON mode', () => {
        const pino = jest.requireMock('pino').default;
        const logger = new LoggerServiceImpl({ name: 'api', json: true, base: { region: 'test' } });

        logger.info('ready', { requestId: 'request-1' });

        expect(pino).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'api',
                base: expect.objectContaining({ service: 'api', region: 'test' }),
            }),
        );
        expect(pino.mock.calls[0][0].transport).toBeUndefined();
        expect(loggerMock.info).toHaveBeenCalledWith('ready', { region: 'test', requestId: 'request-1' });
    });

    it('merges async request context with explicit log context', () => {
        const logger = new LoggerServiceImpl({ name: 'api' });

        LoggerServiceImpl.runWithContext({ requestId: 'request-1', actorId: 'actor-1' }, () => {
            logger.warn('slow request', { statusCode: 503 });
        });

        expect(loggerMock.warn).toHaveBeenCalledWith('slow request', {
            requestId: 'request-1',
            actorId: 'actor-1',
            statusCode: 503,
        });
    });

    it('normalizes errors and request logs', () => {
        const logger = new LoggerServiceImpl({ name: 'api' });
        const error = new Error('boom');

        logger.error(error, { requestId: 'request-1' });
        logger.logRequest({
            method: 'GET',
            url: '/resources/1',
            requestId: 'request-1',
            startTime: Date.now(),
            statusCode: 404,
        });

        expect(loggerMock.error).toHaveBeenCalledWith(
            expect.objectContaining({
                requestId: 'request-1',
                err: expect.objectContaining({ message: 'boom', name: 'Error' }),
            }),
            'boom',
        );
        expect(loggerMock.warn).toHaveBeenCalledWith(
            'GET /resources/1 404',
            expect.objectContaining({ requestId: 'request-1', statusCode: 404 }),
        );
    });

    it('exports configurable Nest module providers', () => {
        const module = LoggerModule.register({ name: 'api' });

        expect(Logger).toBe(LoggerServiceImpl);
        expect(module.module).toBe(LoggerModule);
        expect(module.providers?.length).toBeGreaterThan(0);
        expect(module.exports).toEqual(expect.arrayContaining([LoggerServiceImpl, Logger]));
    });
});
