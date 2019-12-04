import { Test, TestingModule } from '@nestjs/testing';
import { CryptModule } from './crypt.module';
import { CryptService } from './crypt.service';

describe('Crypt Module', () => {
    it('Will boot crypt module succesfully', async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CryptModule.register({ salt: 'test' })]
        }).compile();

        const service: CryptService = module.get(CryptService);

        expect(service).toBeDefined();
    });

    it('Will boot crypt module succesfully async', async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                CryptModule.registerAsync({
                    useFactory: async () => {
                        return { salt: 'test' };
                    }
                })
            ]
        }).compile();

        const service: CryptService = module.get(CryptService);

        expect(service).toBeDefined();
    });
});
