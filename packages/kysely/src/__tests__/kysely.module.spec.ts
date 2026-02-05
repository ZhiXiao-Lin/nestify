import { Test, TestingModule } from '@nestjs/testing';
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
