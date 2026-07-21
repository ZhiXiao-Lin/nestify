import { LoggerConfigurationError, type LoggerModuleOptions } from '../logger.types';
import {
    createLoggerModuleOptions,
    DEFAULT_LOG_EXCLUDE_PATHS,
    DEFAULT_LOG_REDACTION_PATHS,
    DEFAULT_MAX_REQUEST_ID_LENGTH,
    DEFAULT_REQUEST_ID_HEADERS,
    normalizeLoggerModuleOptions,
    normalizeLogInterceptorOptions,
} from '../logger-options';

describe('logger options', () => {
    it('normalizes secure production defaults', () => {
        const options = normalizeLoggerModuleOptions({}, { NODE_ENV: 'production' });

        expect(options).toEqual({
            level: 'info',
            name: 'app',
            prettyPrint: false,
            redact: [...DEFAULT_LOG_REDACTION_PATHS],
            redactionCensor: '[Redacted]',
            base: {},
            interceptor: {
                excludePaths: [...DEFAULT_LOG_EXCLUDE_PATHS],
                logRequestBody: false,
                logResponseBody: false,
                logRequestHeaders: false,
                requestIdHeaders: [...DEFAULT_REQUEST_ID_HEADERS],
                responseRequestIdHeader: 'x-request-id',
                maxRequestIdLength: DEFAULT_MAX_REQUEST_ID_LENGTH,
            },
        });
    });

    it('derives pretty output from explicit options and development', () => {
        expect(normalizeLoggerModuleOptions({}, { NODE_ENV: 'development' }).prettyPrint).toBe(true);
        expect(normalizeLoggerModuleOptions({ json: false }, {}).prettyPrint).toBe(true);
        expect(normalizeLoggerModuleOptions({ json: true }, { NODE_ENV: 'development' }).prettyPrint).toBe(false);
        expect(
            normalizeLoggerModuleOptions({ json: false, prettyPrint: false }, { NODE_ENV: 'development' }).prettyPrint,
        ).toBe(false);
    });

    it('copies base data, combines redaction paths, and normalizes interceptor options', () => {
        const base = { region: 'cn-east-1' };
        const normalized = normalizeLoggerModuleOptions(
            {
                level: 'debug',
                name: ' api ',
                base,
                redact: ['credentials.secret', 'password'],
                redactionCensor: '<hidden>',
                interceptor: {
                    excludePaths: ['/internal/', '/internal/'],
                    requestIdHeaders: ['X-Trace-ID', 'x-trace-id'],
                    responseRequestIdHeader: 'X-Trace-ID',
                    maxRequestIdLength: 64,
                    logRequestBody: true,
                    logResponseBody: true,
                    logRequestHeaders: true,
                },
            },
            {},
        );

        expect(normalized).toMatchObject({
            level: 'debug',
            name: 'api',
            redactionCensor: '<hidden>',
            interceptor: {
                excludePaths: ['/internal'],
                requestIdHeaders: ['x-trace-id'],
                responseRequestIdHeader: 'x-trace-id',
                maxRequestIdLength: 64,
                logRequestBody: true,
                logResponseBody: true,
                logRequestHeaders: true,
            },
        });
        expect(normalized.base).toEqual(base);
        expect(normalized.base).not.toBe(base);
        expect(normalized.redact).toEqual(expect.arrayContaining(['password', 'credentials.secret']));
        expect(normalized.redact.filter(path => path === 'password')).toHaveLength(1);
    });

    it('preserves an explicit redaction opt-out through the public builder', () => {
        const options = createLoggerModuleOptions({ redact: false, json: true });
        expect(options.redact).toBe(false);
        expect(normalizeLoggerModuleOptions(options, {}).redact).toEqual([]);
    });

    it('returns fully validated public options from the builder', () => {
        expect(createLoggerModuleOptions({ name: 'api', level: 'warn', prettyPrint: true })).toMatchObject({
            name: 'api',
            level: 'warn',
            prettyPrint: true,
            json: false,
            interceptor: expect.objectContaining({ maxRequestIdLength: 128 }),
        });
    });

    it.each([
        [null, 'Logger module options must be an object'],
        [[], 'Logger module options must be an object'],
        [{ level: 'verbose' }, 'Unsupported log level: verbose'],
        [{ name: '\n' }, 'name must be a non-empty single-line string'],
        [{ prettyPrint: 'yes' }, 'prettyPrint must be a boolean'],
        [{ json: 'yes' }, 'json must be a boolean'],
        [{ base: [] }, 'base must be an object'],
        [{ base: { service: 'spoofed' } }, 'base.service is reserved by the logger'],
        [{ redact: 'password' }, 'redact must be an array of Pino paths or false'],
        [{ redact: [''] }, 'redact[0] must be a non-empty single-line string'],
        [{ redactionCensor: '\r\n' }, 'redactionCensor must be a non-empty single-line string'],
        [{ interceptor: [] }, 'log interceptor options must be an object'],
    ])('rejects invalid logger options %#', (input, message) => {
        expect(() => normalizeLoggerModuleOptions(input as LoggerModuleOptions, {})).toThrow(message as string);
    });

    it('rejects an invalid runtime environment', () => {
        expect(() => normalizeLoggerModuleOptions({}, null as never)).toThrow(
            'Logger runtime environment must be an object',
        );
    });

    it.each([
        [{ excludePaths: 'health' }, 'excludePaths must be an array'],
        [{ excludePaths: ['health'] }, 'excludePaths[0] must start with /'],
        [{ excludePaths: [''] }, 'excludePaths[0] must be a non-empty single-line string'],
        [{ requestIdHeaders: [] }, 'requestIdHeaders must contain at least one header name'],
        [{ requestIdHeaders: 'x-id' }, 'requestIdHeaders must be an array'],
        [{ requestIdHeaders: ['bad header'] }, 'requestIdHeaders[0] must be a valid HTTP header name'],
        [{ responseRequestIdHeader: 'bad header' }, 'responseRequestIdHeader must be a valid HTTP header name'],
        [{ maxRequestIdLength: 0 }, 'maxRequestIdLength must be a positive safe integer'],
        [{ maxRequestIdLength: 1_025 }, 'maxRequestIdLength cannot exceed 1024'],
        [{ logRequestBody: 'yes' }, 'logRequestBody must be a boolean'],
        [{ logResponseBody: 'yes' }, 'logResponseBody must be a boolean'],
        [{ logRequestHeaders: 'yes' }, 'logRequestHeaders must be a boolean'],
    ])('rejects invalid interceptor options %#', (input, message) => {
        expect(() => normalizeLogInterceptorOptions(input as never)).toThrow(message as string);
    });

    it('supports disabling the response request id header', () => {
        expect(normalizeLogInterceptorOptions({ responseRequestIdHeader: false }).responseRequestIdHeader).toBe(false);
    });

    it('exposes a structured configuration error', () => {
        const cause = new Error('cause');
        expect(new LoggerConfigurationError('bad', { cause })).toMatchObject({
            name: 'LoggerConfigurationError',
            code: 'LOGGER_CONFIGURATION_ERROR',
            statusCode: 500,
            cause,
        });
    });
});
