import { CryptService } from './crypt.service';

describe('Crypt Service', () => {
    let service: CryptService;

    beforeEach(async () => {
        service = new CryptService({ salt: 'test' });
    });

    it('Encryption should succeed', async () => {
        const hash = await service.encrypt('test');

        expect(hash).toBeDefined();
        expect(hash.length).toEqual(60);
    });

    it('Hash comparison should be correct', async () => {
        const a = await service.compare('test', '$2a$10$WUKKFxmTVo5KNBza./N1MOZ.gK27qX.t46/hh2fhWFJ.o9zGCurwm');
        const b = await service.compare('test', '$2a$10$m/n/4OXtGOOym/S/bFf1gup2zBkZlff7oI1e8CQDXC9VQNonv8ery');

        expect(a && b).toEqual(true);
    });
});
