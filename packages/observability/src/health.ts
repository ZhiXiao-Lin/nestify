import type { DynamicModule, FactoryProvider, ModuleMetadata, Provider } from '@nestjs/common';
import { Controller, Get, Inject, Module } from '@nestjs/common';
import {
    HealthCheck,
    HealthCheckError,
    type HealthCheckResult,
    HealthCheckService,
    type HealthIndicatorResult,
    TerminusModule,
} from '@nestjs/terminus';

export type HealthProbe = (signal?: AbortSignal) => unknown | Promise<unknown>;
export type HealthCheckFactory = () => Promise<HealthIndicatorResult>;

export interface HealthCheckOptions {
    timeoutMs?: number;
    exposeErrorDetails?: boolean;
}

export interface HealthCheckRegistration {
    name: string;
    inject?: FactoryProvider['inject'];
    useFactory: FactoryProvider<HealthCheckFactory>['useFactory'];
}

export interface HealthModuleOptions {
    imports?: ModuleMetadata['imports'];
    checks?: HealthCheckRegistration[];
    liveStatus?: Record<string, unknown>;
    isGlobal?: boolean;
}

export const HEALTH_CHECKS = Symbol('HEALTH_CHECKS');
export const HEALTH_LIVE_STATUS = Symbol('HEALTH_LIVE_STATUS');
export const DEFAULT_HEALTH_CHECK_OPTIONS: Readonly<Required<HealthCheckOptions>> = Object.freeze({
    timeoutMs: 5000,
    exposeErrorDetails: false,
});

const HEALTH_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_.:-]{0,63}$/;
const MAX_HEALTH_TIMEOUT_MS = 300_000;

export class HealthProbeTimeoutError extends Error {
    constructor(
        readonly checkName: string,
        readonly timeoutMs: number,
    ) {
        super(`Health check ${checkName} timed out after ${timeoutMs}ms`);
        this.name = 'HealthProbeTimeoutError';
    }
}

export function createHealthCheck(
    name: string,
    probe: HealthProbe,
    failureMessage?: string,
    options: HealthCheckOptions = {},
): HealthCheckFactory {
    assertHealthName(name);
    if (typeof probe !== 'function') throw new TypeError('health probe must be a function');
    if (!isRecord(options)) throw new TypeError('health check options must be an object');
    const normalizedOptions = { ...DEFAULT_HEALTH_CHECK_OPTIONS, ...options };
    assertTimeout(normalizedOptions.timeoutMs);
    if (typeof normalizedOptions.exposeErrorDetails !== 'boolean') {
        throw new TypeError('exposeErrorDetails must be a boolean');
    }
    const safeFailureMessage = normalizeMessage(failureMessage ?? `${name} check failed`);

    return async () => {
        try {
            await runProbeWithTimeout(name, probe, normalizedOptions.timeoutMs);
            return { [name]: { status: 'up' } };
        } catch (error) {
            throw new HealthCheckError(safeFailureMessage, {
                [name]: {
                    status: 'down',
                    message: normalizedOptions.exposeErrorDetails ? serializeHealthError(error) : safeFailureMessage,
                },
            });
        }
    };
}

@Controller()
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        @Inject(HEALTH_CHECKS)
        private readonly checks: HealthCheckFactory[],
        @Inject(HEALTH_LIVE_STATUS)
        private readonly liveStatus: Record<string, unknown>,
    ) {}

    @Get('health')
    @HealthCheck()
    check(): Promise<HealthCheckResult> {
        return this.health.check(this.checks);
    }

    @Get('health/live')
    live(): Record<string, unknown> {
        return cloneHealthValue(this.liveStatus) as Record<string, unknown>;
    }

    @Get('health/ready')
    @HealthCheck()
    ready(): Promise<HealthCheckResult> {
        return this.health.check(this.checks);
    }
}

@Module({
    imports: [TerminusModule],
    controllers: [HealthController],
    providers: [
        { provide: HEALTH_CHECKS, useValue: [] },
        { provide: HEALTH_LIVE_STATUS, useValue: Object.freeze({ status: 'ok' }) },
    ],
})
export class HealthModule {
    static register(options: HealthModuleOptions = {}): DynamicModule {
        const normalized = normalizeHealthModuleOptions(options);
        const checkTokens = normalized.checks.map((check, index) => Symbol(`HEALTH_CHECK_${index}_${check.name}`));
        const checkProviders: Provider[] = normalized.checks.map((check, index) => ({
            provide: checkTokens[index],
            useFactory: async (...dependencies: any[]) => {
                const factory = await check.useFactory(...dependencies);
                if (typeof factory !== 'function') {
                    throw new TypeError(`health check ${check.name} factory must return a function`);
                }
                return factory;
            },
            inject: check.inject ?? [],
        }));

        return {
            module: HealthModule,
            global: normalized.isGlobal,
            imports: [TerminusModule, ...normalized.imports],
            controllers: [HealthController],
            providers: [
                ...checkProviders,
                {
                    provide: HEALTH_CHECKS,
                    useFactory: (...checks: HealthCheckFactory[]) => Object.freeze([...checks]),
                    inject: checkTokens,
                },
                {
                    provide: HEALTH_LIVE_STATUS,
                    useValue: normalized.liveStatus,
                },
            ],
        };
    }
}

interface NormalizedHealthModuleOptions {
    imports: NonNullable<ModuleMetadata['imports']>;
    checks: HealthCheckRegistration[];
    liveStatus: Readonly<Record<string, unknown>>;
    isGlobal: boolean;
}

function normalizeHealthModuleOptions(options: HealthModuleOptions): NormalizedHealthModuleOptions {
    if (!isRecord(options)) throw new TypeError('health module options must be an object');
    const imports = options.imports === undefined ? [] : options.imports;
    const checks = options.checks === undefined ? [] : options.checks;
    if (!Array.isArray(imports)) throw new TypeError('health module imports must be an array');
    if (!Array.isArray(checks)) throw new TypeError('health module checks must be an array');
    if (checks.length > 100) throw new RangeError('health module supports at most 100 checks');
    if (options.isGlobal !== undefined && typeof options.isGlobal !== 'boolean') {
        throw new TypeError('health module isGlobal must be a boolean');
    }

    const names = new Set<string>();
    const normalizedChecks = checks.map(check => {
        if (!isRecord(check)) throw new TypeError('each health check registration must be an object');
        assertHealthName(check.name);
        if (names.has(check.name)) throw new Error(`duplicate health check name: ${check.name}`);
        names.add(check.name);
        if (typeof check.useFactory !== 'function') {
            throw new TypeError(`health check ${check.name} useFactory must be a function`);
        }
        if (check.inject !== undefined && !Array.isArray(check.inject)) {
            throw new TypeError(`health check ${check.name} inject must be an array`);
        }
        return { ...check, inject: check.inject ? [...check.inject] : [] };
    });

    const liveStatus = options.liveStatus === undefined ? { status: 'ok' } : options.liveStatus;
    if (!isRecord(liveStatus)) throw new TypeError('health liveStatus must be an object');

    return {
        imports: [...imports],
        checks: normalizedChecks,
        liveStatus: deepFreeze(cloneHealthValue(liveStatus) as Record<string, unknown>),
        isGlobal: options.isGlobal ?? false,
    };
}

async function runProbeWithTimeout(name: string, probe: HealthProbe, timeoutMs: number): Promise<void> {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
            controller.abort();
            reject(new HealthProbeTimeoutError(name, timeoutMs));
        }, timeoutMs);
        timeout.unref?.();
    });
    try {
        await Promise.race([Promise.resolve().then(() => probe(controller.signal)), timeoutPromise]);
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}

function cloneHealthValue(value: unknown, depth = 0, state = { entries: 0 }): unknown {
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.slice(0, 1024);
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (depth >= 8 || state.entries >= 1000) return '<truncated>';
    if (Array.isArray(value)) {
        return value.slice(0, 100).map(entry => {
            state.entries += 1;
            return cloneHealthValue(entry, depth + 1, state);
        });
    }
    if (!isRecord(value)) return '<unsupported>';
    const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const [key, descriptor] of Object.entries(descriptors).slice(0, 100)) {
        if (state.entries >= 1000) break;
        state.entries += 1;
        result[key.slice(0, 128)] =
            'value' in descriptor ? cloneHealthValue(descriptor.value, depth + 1, state) : '<accessor>';
    }
    return result;
}

function deepFreeze<T>(value: T): T {
    if (value && typeof value === 'object') {
        Object.freeze(value);
        for (const entry of Object.values(value)) deepFreeze(entry);
    }
    return value;
}

function serializeHealthError(error: unknown): string {
    if (error instanceof HealthProbeTimeoutError) return error.message;
    if (error instanceof Error) return normalizeMessage(error.message || error.name);
    return normalizeMessage(typeof error === 'string' ? error : 'Health check failed');
}

function normalizeMessage(message: string): string {
    if (typeof message !== 'string') throw new TypeError('health failure message must be a string');
    const normalized = message.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
    if (!normalized) throw new TypeError('health failure message must not be empty');
    return normalized.slice(0, 256);
}

function assertHealthName(name: string): void {
    if (typeof name !== 'string' || !HEALTH_NAME_PATTERN.test(name)) {
        throw new TypeError('health check name must match /^[a-zA-Z][a-zA-Z0-9_.:-]{0,63}$/');
    }
}

function assertTimeout(timeoutMs: number): void {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_HEALTH_TIMEOUT_MS) {
        throw new RangeError(`health check timeoutMs must be between 1 and ${MAX_HEALTH_TIMEOUT_MS}`);
    }
}

function isRecord(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
