import { Test, TestingModule } from '@nestjs/testing';
import { PostgresDialect } from 'kysely';
import { createPostgresKyselyModuleOptions, createPostgresPoolConfig } from '../postgres';
import { KyselyModule } from '../kysely.module';
import { KyselyService } from '../kysely.service';
import { MODULE_OPTIONS_TOKEN } from '../kysely.module-definition';

// Mock Kysely
jest.mock('kysely', () => {
    return {
        Kysely: jest.fn().mockImplementation(() => ({
            destroy: jest.fn().mockResolvedValue(undefined),
            selectFrom: jest.fn().mockReturnThis(),
            insertInto: jest.fn().mockReturnThis(),
            updateTable: jest.fn().mockReturnThis(),
            deleteFrom: jest.fn().mockReturnThis(),
        })),
        PostgresDialect: jest.fn().mockImplementation(options => ({ kind: 'postgres', options })),
    };
});

describe('KyselyModule', () => {
    let module: TestingModule;

    const mockOptions = {
        config: {
            dialect: {} as any,
        },
    };

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [KyselyModule.register(mockOptions)],
        }).compile();
    });

    afterEach(async () => {
        if (module) {
            await module.close();
        }
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
    });

    it('should provide KyselyService', () => {
        const service = module.get<KyselyService<any>>(KyselyService);
        expect(service).toBeDefined();
    });

    it('should inject module options', () => {
        const options = module.get(MODULE_OPTIONS_TOKEN);
        expect(options).toEqual(mockOptions);
    });
});

describe('KyselyModule.registerAsync', () => {
    let module: TestingModule;

    const mockOptions = {
        config: {
            dialect: {} as any,
        },
    };

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [
                KyselyModule.registerAsync({
                    useFactory: () => mockOptions,
                }),
            ],
        }).compile();
    });

    afterEach(async () => {
        if (module) {
            await module.close();
        }
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
    });

    it('should provide KyselyService with async config', () => {
        const service = module.get<KyselyService<any>>(KyselyService);
        expect(service).toBeDefined();
    });
});

describe('Postgres Kysely options', () => {
    it('creates pool config from explicit connection values', () => {
        expect(
            createPostgresPoolConfig({
                host: 'db',
                port: '5433',
                user: 'app',
                password: '',
                database: 'orders',
                max: '12',
                pool: { application_name: 'api' },
            }),
        ).toEqual({
            application_name: 'api',
            host: 'db',
            port: 5433,
            user: 'app',
            database: 'orders',
            max: 12,
        });
    });

    it('creates module options with a postgres dialect and optional logger', () => {
        const options = createPostgresKyselyModuleOptions({
            host: 'db',
            logger: { consoleOutput: false },
        });

        expect(PostgresDialect).toHaveBeenCalledWith({
            pool: expect.objectContaining({
                options: expect.objectContaining({ host: 'db' }),
            }),
        });
        expect(options.config.dialect).toEqual(expect.objectContaining({ kind: 'postgres' }));
        expect(options.config.log).toEqual(expect.any(Function));
    });
});
