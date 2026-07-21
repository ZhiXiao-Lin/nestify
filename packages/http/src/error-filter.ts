import { DomainValidationError } from '@a3s-lab/ddd';
import {
    type ArgumentsHost,
    Catch,
    type DynamicModule,
    type ExceptionFilter,
    type FactoryProvider,
    Global,
    HttpException,
    Inject,
    Logger,
    Module,
    type ModuleMetadata,
    Optional,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import type { Request, Response } from 'express';
import { BusinessException, getStatusMessage, StatusCode } from './exceptions';
import {
    getSafeRequestMethod,
    getSafeRequestPath,
    HttpConfigurationError,
    normalizeHttpStatus,
    normalizeHttpText,
    normalizePublicDetails,
} from './http-boundary';
import { DomainException } from './presentation';
import { attachRequestIdHeader, getOrCreateRequestId } from './request-id';

export const ERROR_FILTER_OPTIONS = Symbol.for('@a3s-lab/http/error-filter-options');

export interface ErrorFilterOptions {
    /** Expose generic Nest HttpException messages for 5xx responses. Defaults to false. */
    exposeHttp5xxMessages?: boolean;
    /** Include normalized public details in error responses. Defaults to true. */
    includeDetails?: boolean;
    /** Include server-side exception stacks in Nest logs. Defaults to true. */
    logStack?: boolean;
}

export interface ErrorFilterAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    inject?: FactoryProvider['inject'];
    useFactory: FactoryProvider<ErrorFilterOptions>['useFactory'];
}

interface NormalizedErrorFilterOptions {
    readonly exposeHttp5xxMessages: boolean;
    readonly includeDetails: boolean;
    readonly logStack: boolean;
}

interface ErrorResponse {
    code: number;
    status: StatusCode;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
    timestamp: string;
}

export function createErrorFilterOptions(options: ErrorFilterOptions = {}): NormalizedErrorFilterOptions {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new HttpConfigurationError('Error filter options must be an object.');
    }
    for (const field of ['exposeHttp5xxMessages', 'includeDetails', 'logStack'] as const) {
        if (options[field] !== undefined && typeof options[field] !== 'boolean') {
            throw new HttpConfigurationError(`${field} must be a boolean.`);
        }
    }
    return Object.freeze({
        exposeHttp5xxMessages: options.exposeHttp5xxMessages ?? false,
        includeDetails: options.includeDetails ?? true,
        logStack: options.logStack ?? true,
    });
}

@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalErrorFilter.name);
    private readonly options: NormalizedErrorFilterOptions;

    constructor(@Optional() @Inject(ERROR_FILTER_OPTIONS) options: ErrorFilterOptions = {}) {
        this.options = createErrorFilterOptions(options);
    }

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const requestId = getOrCreateRequestId(request);
        const requestContext = {
            requestId,
            path: getSafeRequestPath(request),
            method: getSafeRequestMethod(request),
        };

        if (response.headersSent) {
            this.logInternalError('Exception occurred after response headers were sent', exception, requestContext);
            return;
        }
        attachRequestIdHeader(response, requestId);

        const normalized = this.normalizeDomainException(exception);
        const errorResponse = this.createErrorResponse(normalized, requestId);
        this.logException(normalized, errorResponse, requestContext);
        response.status(errorResponse.code).json(errorResponse);
    }

    private normalizeDomainException(exception: unknown): unknown {
        if (exception instanceof DomainValidationError) {
            return new BusinessException({
                code: StatusCode.VALIDATION_ERROR,
                message: exception.message,
                details: exception.details,
            });
        }
        if (exception instanceof DomainException) {
            return new BusinessException({
                code: StatusCode.BUSINESS_RULE_VIOLATION,
                message: exception.message,
                details: { type: exception.name },
            });
        }
        return exception;
    }

    private createErrorResponse(exception: unknown, requestId: string): ErrorResponse {
        const timestamp = new Date().toISOString();
        if (exception instanceof BusinessException) {
            return {
                code: normalizeHttpStatus(exception.getStatus()),
                status: exception.code,
                message: normalizeHttpText(exception.message, {
                    fallback: getStatusMessage(exception.code),
                    maxLength: 1_024,
                }),
                details: this.options.includeDetails ? normalizePublicDetails(exception.details) : undefined,
                requestId,
                timestamp,
            };
        }

        if (exception instanceof HttpException) {
            const status = normalizeHttpStatus(exception.getStatus());
            const response = exception.getResponse();
            const expose = status < 500 || this.options.exposeHttp5xxMessages;
            const code = expose
                ? resolveStatusCode(status, response)
                : (HTTP_STATUS_TO_CODE[status] ?? StatusCode.INTERNAL_SERVER_ERROR);
            return {
                code: status,
                status: code,
                message: expose ? extractHttpMessage(response, code) : getStatusMessage(code),
                details: expose && this.options.includeDetails ? extractHttpDetails(response) : undefined,
                requestId,
                timestamp,
            };
        }

        return {
            code: 500,
            status: StatusCode.INTERNAL_SERVER_ERROR,
            message: getStatusMessage(StatusCode.INTERNAL_SERVER_ERROR),
            requestId,
            timestamp,
        };
    }

    private logException(exception: unknown, response: ErrorResponse, context: Record<string, string>): void {
        if (response.code >= 500) {
            this.logInternalError(`[${response.code}] ${response.message}`, exception, context);
            return;
        }
        this.logger.warn(`[${response.code}] ${response.message}`, context);
    }

    private logInternalError(message: string, exception: unknown, context: Record<string, string>): void {
        const safeExceptionMessage =
            exception instanceof Error
                ? normalizeHttpText(exception.message, { fallback: exception.name, maxLength: 1_024 })
                : normalizeHttpText(String(exception), { fallback: 'Unknown exception', maxLength: 1_024 });
        const logMessage = `${message}: ${safeExceptionMessage}`;
        const stack = this.options.logStack && exception instanceof Error ? exception.stack : undefined;
        this.logger.error(logMessage, stack, context);
    }
}

function resolveStatusCode(status: number, exceptionResponse: unknown): StatusCode {
    if (isRecord(exceptionResponse)) {
        const maybeStatus = exceptionResponse.status;
        if (typeof maybeStatus === 'string' && Object.values(StatusCode).includes(maybeStatus as StatusCode)) {
            return maybeStatus as StatusCode;
        }
    }
    return HTTP_STATUS_TO_CODE[status] ?? (status >= 500 ? StatusCode.INTERNAL_SERVER_ERROR : StatusCode.BAD_REQUEST);
}

function extractHttpMessage(exceptionResponse: unknown, code: StatusCode): string {
    if (isRecord(exceptionResponse) && typeof exceptionResponse.message === 'string') {
        return normalizeHttpText(exceptionResponse.message, {
            fallback: getStatusMessage(code),
            maxLength: 1_024,
        });
    }
    if (typeof exceptionResponse === 'string') {
        return normalizeHttpText(exceptionResponse, { fallback: getStatusMessage(code), maxLength: 1_024 });
    }
    return getStatusMessage(code);
}

function extractHttpDetails(exceptionResponse: unknown): Record<string, unknown> | undefined {
    if (!isRecord(exceptionResponse)) {
        return undefined;
    }
    if (Array.isArray(exceptionResponse.fieldErrors)) {
        return normalizePublicDetails({ fieldErrors: exceptionResponse.fieldErrors });
    }
    if (Array.isArray(exceptionResponse.errors)) {
        return normalizePublicDetails({ fieldErrors: exceptionResponse.errors });
    }
    if (isRecord(exceptionResponse.details)) {
        return normalizePublicDetails(exceptionResponse.details);
    }
    if (Array.isArray(exceptionResponse.message)) {
        return normalizePublicDetails({ messages: exceptionResponse.message });
    }
    return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

const HTTP_STATUS_TO_CODE: Readonly<Record<number, StatusCode>> = Object.freeze({
    400: StatusCode.BAD_REQUEST,
    401: StatusCode.UNAUTHORIZED,
    403: StatusCode.FORBIDDEN,
    404: StatusCode.NOT_FOUND,
    405: StatusCode.BAD_REQUEST,
    408: StatusCode.BAD_REQUEST,
    409: StatusCode.CONFLICT,
    410: StatusCode.GONE,
    413: StatusCode.PAYLOAD_TOO_LARGE,
    415: StatusCode.BAD_REQUEST,
    422: StatusCode.UNPROCESSABLE_ENTITY,
    429: StatusCode.TOO_MANY_REQUESTS,
    500: StatusCode.INTERNAL_SERVER_ERROR,
    501: StatusCode.NOT_IMPLEMENTED,
    502: StatusCode.EXTERNAL_SERVICE_ERROR,
    503: StatusCode.SERVICE_UNAVAILABLE,
    504: StatusCode.GATEWAY_TIMEOUT,
});

@Global()
@Module({
    providers: [{ provide: APP_FILTER, useClass: GlobalErrorFilter }],
})
export class ErrorsModule {
    static register(options: ErrorFilterOptions = {}): DynamicModule {
        return {
            module: ErrorsModule,
            providers: [{ provide: ERROR_FILTER_OPTIONS, useValue: createErrorFilterOptions(options) }],
        };
    }

    static registerAsync(options: ErrorFilterAsyncOptions): DynamicModule {
        if (!options || typeof options !== 'object' || typeof options.useFactory !== 'function') {
            throw new HttpConfigurationError('ErrorsModule.registerAsync requires a useFactory function.');
        }
        return {
            module: ErrorsModule,
            imports: options.imports,
            providers: [
                {
                    provide: ERROR_FILTER_OPTIONS,
                    inject: options.inject ?? [],
                    useFactory: async (...args: Parameters<ErrorFilterAsyncOptions['useFactory']>) =>
                        createErrorFilterOptions(await options.useFactory(...args)),
                },
            ],
        };
    }
}
