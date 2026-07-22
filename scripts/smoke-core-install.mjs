import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { corePackages } from './core-packages.mjs';

const rootDir = process.cwd();
const artifactsDir = path.join(rootDir, '.artifacts/core-packages');
const packageManager = process.env.CORE_SMOKE_PACKAGE_MANAGER ?? 'pnpm';
const rootPackageManager = readJson(path.join(rootDir, 'package.json')).packageManager;
const keepSmokeWorkspace = process.env.KEEP_CORE_SMOKE === '1';
const consumerDir = mkdtempSync(path.join(os.tmpdir(), 'core-package-consumer-'));
let succeeded = false;

try {
    const packageDependencies = {};
    const peerDependencies = {};

    for (const corePackage of corePackages) {
        const manifest = readJson(path.join(rootDir, corePackage.dir, 'package.json'));
        const tarballPath = expectedTarballPath(manifest);

        if (!existsSync(tarballPath)) {
            throw new Error(`Missing ${tarballPath}; run pnpm pack:core before the smoke install check.`);
        }

        packageDependencies[manifest.name] = toFileDependency(tarballPath);

        for (const [peerName, peerRange] of Object.entries(manifest.peerDependencies ?? {})) {
            peerDependencies[peerName] ??= peerRange;
        }
    }

    const developmentDependencies = {
        '@types/express': '^5.0.0',
        '@types/node': '^20.0.0',
        typescript: '5.7.2',
    };
    for (const developmentDependency of Object.keys(developmentDependencies)) {
        delete peerDependencies[developmentDependency];
    }

    const packageJson = {
        name: 'core-package-consumer-smoke',
        version: '0.0.0',
        private: true,
        packageManager: rootPackageManager,
        scripts: {
            typecheck: 'tsc --noEmit',
            smoke: 'node smoke.cjs',
        },
        dependencies: sortObject({
            ...peerDependencies,
            ...packageDependencies,
            'reflect-metadata': '^0.1.13',
        }),
        devDependencies: sortObject(developmentDependencies),
    };

    writeJson(path.join(consumerDir, 'package.json'), packageJson);
    writeFileSync(path.join(consumerDir, 'pnpm-workspace.yaml'), pnpmWorkspaceSource(packageDependencies));
    writeJson(path.join(consumerDir, 'tsconfig.json'), {
        compilerOptions: {
            module: 'Node16',
            moduleResolution: 'Node16',
            target: 'ES2021',
            strict: true,
            skipLibCheck: true,
            esModuleInterop: true,
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
        },
        include: ['smoke.ts'],
    });
    writeFileSync(path.join(consumerDir, 'smoke.ts'), smokeTypescriptSource());
    writeFileSync(path.join(consumerDir, 'smoke.cjs'), smokeNodeSource());

    run(packageManager, ['install', '--ignore-scripts', '--config.strict-peer-dependencies=false']);
    const installedTypeScriptVersion = readJson(
        path.join(consumerDir, 'node_modules', 'typescript', 'package.json'),
    ).version;
    if (installedTypeScriptVersion !== developmentDependencies.typescript) {
        throw new Error(
            `Expected TypeScript ${developmentDependencies.typescript}, installed ${installedTypeScriptVersion}`,
        );
    }
    run(packageManager, ['exec', 'tsc', '--noEmit']);
    run('node', ['smoke.cjs']);

    succeeded = true;
    console.log(`Smoke-installed and imported ${corePackages.length} core package tarballs.`);
} finally {
    if (succeeded && !keepSmokeWorkspace) {
        rmSync(consumerDir, { recursive: true, force: true });
    } else {
        console.log(`Core package smoke workspace: ${consumerDir}`);
    }
}

function run(command, args) {
    execFileSync(command, args, {
        cwd: consumerDir,
        stdio: 'inherit',
        env: process.env,
        shell: process.platform === 'win32',
    });
}

function expectedTarballPath(manifest) {
    const tarballName = `${manifest.name.replace(/^@/, '').replace(/\//g, '-')}-${manifest.version}.tgz`;
    return path.join(artifactsDir, tarballName);
}

function toFileDependency(filePath) {
    return pathToFileURL(filePath).href;
}

function readJson(filePath) {
    return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
    writeFileSync(filePath, `${JSON.stringify(value, null, 4)}\n`);
}

function sortObject(value) {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

function pnpmWorkspaceSource(overrides) {
    const lines = ['packages:', "  - '.'", 'overrides:'];

    for (const [packageName, packagePath] of Object.entries(sortObject(overrides))) {
        lines.push(`  ${JSON.stringify(packageName)}: ${JSON.stringify(packagePath)}`);
    }

    return `${lines.join('\n')}\n`;
}

function smokeTypescriptSource() {
    return `import 'reflect-metadata';
import { AiModule, AiService } from '@a3s-lab/ai';
import { Result, type IDomainEvent } from '@a3s-lab/ddd';
import { createNestCqrsDomainEventPublisherProvider, NestCqrsDomainEventPublisher } from '@a3s-lab/cqrs';
import { ApiResponseDto, getOrCreateRequestId, StatusCode } from '@a3s-lab/http';
import { JwtTokenHelper, PathSecurityValidator, Public } from '@a3s-lab/security';
import { DEFAULT_HISTOGRAM_BUCKETS, createHealthCheck, MetricsService } from '@a3s-lab/observability';
import {
    DEFAULT_LOG_REDACTION_PATHS,
    LoggerConfigurationError,
    LoggerServiceImpl,
    createLoggerModuleOptions,
    type LogInterceptorOptions,
} from '@a3s-lab/logger';
import { ResilienceModule, RetryService } from '@a3s-lab/resilience';
import {
    createKyselyLogger,
    createPostgresPoolConfig,
    KyselyConfigurationError,
    KyselyModule,
    type ConfiguredKyselyModuleOptions,
} from '@a3s-lab/kysely';
import {
    type DeleteByPatternOptions,
    RedissonModule,
    RedissonPatternDeleteError,
    createRedissonModuleOptions,
} from '@a3s-lab/redisson';
import {
    BullMQModule,
    BullMQService,
    createBullMQModuleOptions,
    type BullMQHealthResult,
    type BullMQWorkerOptions,
} from '@a3s-lab/bullmq';
import {
    type NatsConnectionOptions,
    type NatsHealthResult,
    NatsModule,
    NatsServiceClosedError,
    type RequestManyOptions,
    createNatsConnectionOptions,
} from '@a3s-lab/nats';
import { RustFSModule } from '@a3s-lab/rustfs';
import { EtcdModule } from '@a3s-lab/etcd';
import {
    CLICKHOUSE_OPTIONS_TOKEN,
    ClickHouseClientPoolExhaustedError,
    type ClickHouseHealthResult,
    ClickHouseModule,
    type ClickHouseRequestOptions,
    createClickHouseClientOptions,
} from '@a3s-lab/clickhouse';
import {
    createMigrationModuleOptions,
    MigrationConfigurationError,
    MigrationModule,
    NON_TRANSACTIONAL_MIGRATION_NAME,
    type MigrationModuleAsyncOptions,
} from '@a3s-lab/migrations';
import { FileUploadModule, getExtension } from '@a3s-lab/files';
import {
    SandboxModule,
    SandboxService,
    createA3SBoxConnectionConfig,
} from '@a3s-lab/sandbox';

const event: IDomainEvent = {
    occurredOn: new Date(),
    getAggregateId: () => 'resource-1',
};

const result: Result<string> = Result.ok('ok');
const requestId: string = getOrCreateRequestId({ headers: {} });
const envelope = new ApiResponseDto({ data: { requestId, value: result.getValue() } });
const tokenHelper = new JwtTokenHelper<{ sub: string }>();
const access = PathSecurityValidator.validatePathAccess('/resources/file.txt');
const healthCheck = createHealthCheck('ready', () => undefined);
const metrics = new MetricsService();
const logger = new LoggerServiceImpl({ json: true });
const loggerOptions = createLoggerModuleOptions({
    name: 'smoke',
    json: true,
    interceptor: { maxRequestIdLength: 64 },
});
const loggerInterceptor: LogInterceptorOptions = { responseRequestIdHeader: false };
const retry = new RetryService();
const pool = createPostgresPoolConfig({ host: 'localhost', port: '5432' });
const queryLogger = createKyselyLogger({ consoleOutput: false });
const configuredKyselyOptions = null as unknown as ConfiguredKyselyModuleOptions;
const redis = createRedissonModuleOptions({ host: 'localhost', port: '6379' });
const redisPatternOptions: DeleteByPatternOptions = { scanCount: 250, batchSize: 50 };
const redisPatternError = new RedissonPatternDeleteError('cache:*', 0, []);
const natsConnection: NatsConnectionOptions = createNatsConnectionOptions({
    servers: 'nats://localhost:4222',
    auth: { token: 'smoke-token' },
});
const natsHealth: NatsHealthResult = {
    healthy: true,
    server: 'nats://localhost:4222',
    latencyMs: 1,
};
const natsRequestMany: RequestManyOptions = {
    subject: 'resources.lookup',
    strategy: 'count',
    expectedResponseCount: 2,
};
const natsClosedError = new NatsServiceClosedError();
const clickhouseClient = createClickHouseClientOptions({
    url: 'https://clickhouse.test:8443',
    database: 'analytics',
    requestTimeoutMs: 2_000,
});
const clickhouseRequest: ClickHouseRequestOptions = {
    database: 'reporting',
    queryParams: { tenant: 'a3s' },
    timeoutMs: 1_000,
};
const clickhouseHealth: ClickHouseHealthResult = {
    healthy: true,
    database: 'analytics',
    latencyMs: 1,
};
const bullmq = createBullMQModuleOptions({
    connection: { host: 'localhost', port: 6379 },
    workerOptions: { concurrency: 2 },
});
const bullmqWorker: BullMQWorkerOptions = { id: 'smoke-worker', concurrency: 1 };
const bullmqHealth: BullMQHealthResult = { healthy: true, queue: 'smoke', latencyMs: 0 };
const provider = createNestCqrsDomainEventPublisherProvider();
const sandboxConnection = createA3SBoxConnectionConfig({
    apiUrl: 'https://api.box.test',
    domain: 'box.test',
});
const migrationOptions = createMigrationModuleOptions({
    migrationFolder: './dist/migrations',
    autoRun: false,
});
const migrationAsyncOptions: MigrationModuleAsyncOptions = {
    useFactory: () => ({ migrationFolder: './dist/migrations' }),
};
const moduleRefs = [
    AiModule,
    NestCqrsDomainEventPublisher,
    ResilienceModule,
    KyselyModule,
    RedissonModule,
    BullMQModule,
    NatsModule,
    RustFSModule,
    EtcdModule,
    ClickHouseModule,
    MigrationModule,
    FileUploadModule,
    SandboxModule,
];
const serviceRefs = [AiService, BullMQService, SandboxService];

void event;
void envelope;
void tokenHelper;
void access;
void healthCheck;
void metrics;
void logger;
void loggerOptions;
void loggerInterceptor;
void DEFAULT_LOG_REDACTION_PATHS;
void LoggerConfigurationError;
void retry;
void pool;
void queryLogger;
void configuredKyselyOptions;
void KyselyConfigurationError;
void redis;
void redisPatternOptions;
void redisPatternError;
void natsConnection;
void natsHealth;
void natsRequestMany;
void natsClosedError;
void clickhouseClient;
void clickhouseRequest;
void clickhouseHealth;
void bullmq;
void bullmqWorker;
void bullmqHealth;
void provider;
void moduleRefs;
void serviceRefs;
void Public;
void StatusCode;
void DEFAULT_HISTOGRAM_BUCKETS;
void CLICKHOUSE_OPTIONS_TOKEN;
void ClickHouseClientPoolExhaustedError;
void NON_TRANSACTIONAL_MIGRATION_NAME;
void MigrationConfigurationError;
void migrationOptions;
void migrationAsyncOptions;

const extension: string = getExtension('file.txt');
if (extension !== '.txt') {
    throw new Error('Unexpected file extension');
}

if (
    sandboxConnection.apiUrl !== 'https://api.box.test' ||
    sandboxConnection.domain !== 'box.test' ||
    sandboxConnection.validateApiKey !== false
) {
    throw new Error('Unexpected A3S Box connection configuration');
}
`;
}

function smokeNodeSource() {
    return `require('reflect-metadata');

const expectedExports = {
    '@a3s-lab/ai': ['AiModule', 'AiService'],
    '@a3s-lab/ddd': ['Result', 'Guard'],
    '@a3s-lab/cqrs': ['NestCqrsDomainEventPublisher', 'createNestCqrsDomainEventPublisherProvider'],
    '@a3s-lab/http': ['ApiResponseDto', 'StatusCode', 'getOrCreateRequestId'],
    '@a3s-lab/security': ['JwtTokenHelper', 'PathSecurityValidator', 'Public'],
    '@a3s-lab/observability': ['MetricsService', 'DEFAULT_HISTOGRAM_BUCKETS', 'createHealthCheck'],
    '@a3s-lab/logger': [
        'LoggerServiceImpl',
        'LoggerModule',
        'LoggingInterceptor',
        'createLoggerModuleOptions',
        'DEFAULT_LOG_REDACTION_PATHS',
        'LoggerConfigurationError',
    ],
    '@a3s-lab/resilience': ['RetryService', 'ResilienceModule', 'CacheService'],
    '@a3s-lab/kysely': [
        'KyselyModule',
        'KyselyService',
        'KyselyConfigurationError',
        'normalizeKyselyModuleOptions',
        'createPostgresPoolConfig',
        'createKyselyLogger',
        'DEFAULT_KYSELY_LOGGER_MAX_SQL_LENGTH',
    ],
    '@a3s-lab/redisson': ['RedissonModule', 'RedissonPatternDeleteError', 'createRedissonModuleOptions'],
    '@a3s-lab/bullmq': [
        'BullMQModule',
        'BullMQService',
        'createBullMQModuleOptions',
        'BullMQServiceClosedError',
        'BullMQShutdownError',
    ],
    '@a3s-lab/nats': [
        'NatsModule',
        'NatsServiceImpl',
        'NatsServiceClosedError',
        'createNatsConnectionOptions',
    ],
    '@a3s-lab/rustfs': ['RustFSModule', 'RustFSServiceImpl'],
    '@a3s-lab/etcd': ['EtcdModule', 'EtcdService'],
    '@a3s-lab/clickhouse': [
        'CLICKHOUSE_OPTIONS_TOKEN',
        'ClickHouseClientPoolExhaustedError',
        'ClickHouseModule',
        'ClickHouseService',
        'createClickHouseClientOptions',
    ],
    '@a3s-lab/migrations': [
        'MigrationModule',
        'MigrationRunner',
        'createFileMigrationProvider',
        'createMigrationModuleOptions',
        'MigrationConfigurationError',
        'MigrationExecutionError',
    ],
    '@a3s-lab/files': ['FileUploadModule', 'FileUploadService', 'getExtension'],
    '@a3s-lab/sandbox': ['SandboxModule', 'SandboxService', 'createA3SBoxConnectionConfig'],
};

for (const [packageName, exportNames] of Object.entries(expectedExports)) {
    const loaded = require(packageName);
    for (const exportName of exportNames) {
        if (loaded[exportName] === undefined) {
            throw new Error(\`\${packageName} is missing \${exportName}\`);
        }
    }
}

const { Result } = require('@a3s-lab/ddd');
const { ApiResponseDto } = require('@a3s-lab/http');
const { PathSecurityValidator } = require('@a3s-lab/security');

if (Result.ok('ok').getValue() !== 'ok') {
    throw new Error('Result Node import smoke failed');
}

if (new ApiResponseDto({ data: 'ok' }).data !== 'ok') {
    throw new Error('HTTP response Node import smoke failed');
}

if (!PathSecurityValidator.validatePathAccess('/safe/path').valid) {
    throw new Error('Security path Node import smoke failed');
}
`;
}
