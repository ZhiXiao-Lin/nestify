import { Controller, Get, Inject, Module } from '@nestjs/common';
import type { DynamicModule, FactoryProvider, Provider } from '@nestjs/common';
import {
    HealthCheck,
    HealthCheckError,
    HealthCheckService,
    TerminusModule,
    type HealthCheckResult,
    type HealthIndicatorResult,
} from '@nestjs/terminus';

export type HealthProbe = () => unknown | Promise<unknown>;
export type HealthCheckFactory = () => Promise<HealthIndicatorResult>;

export interface HealthCheckRegistration {
    name: string;
    inject?: FactoryProvider['inject'];
    useFactory: FactoryProvider<HealthCheckFactory>['useFactory'];
}

export interface HealthModuleOptions {
    checks?: HealthCheckRegistration[];
    liveStatus?: Record<string, unknown>;
}

export const HEALTH_CHECKS = Symbol('HEALTH_CHECKS');
export const HEALTH_LIVE_STATUS = Symbol('HEALTH_LIVE_STATUS');

export function createHealthCheck(
    name: string,
    probe: HealthProbe,
    failureMessage = `${name} check failed`,
): HealthCheckFactory {
    return async () => {
        try {
            await probe();
            return { [name]: { status: 'up' } };
        } catch (error) {
            throw new HealthCheckError(failureMessage, {
                [name]: {
                    status: 'down',
                    message: error instanceof Error ? error.message : String(error),
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
        return this.liveStatus;
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
        { provide: HEALTH_LIVE_STATUS, useValue: { status: 'ok' } },
    ],
})
export class HealthModule {
    static register(options: HealthModuleOptions = {}): DynamicModule {
        const checkTokens = options.checks?.map(check => Symbol(`HEALTH_CHECK_${check.name}`)) ?? [];
        const checkProviders: Provider[] =
            options.checks?.map((check, index) => ({
                provide: checkTokens[index],
                useFactory: check.useFactory,
                inject: check.inject ?? [],
            })) ?? [];

        return {
            module: HealthModule,
            imports: [TerminusModule],
            controllers: [HealthController],
            providers: [
                ...checkProviders,
                {
                    provide: HEALTH_CHECKS,
                    useFactory: (...checks: HealthCheckFactory[]) => checks,
                    inject: checkTokens,
                },
                {
                    provide: HEALTH_LIVE_STATUS,
                    useValue: options.liveStatus ?? { status: 'ok' },
                },
            ],
        };
    }
}
