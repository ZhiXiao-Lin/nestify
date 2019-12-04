import { Verification } from './verification';

describe('Verification', () => {
    it('A string of the specified length should bereturned', async () => {
        const text = Verification.text(5);

        expect(text).toBeDefined();
        expect(text.length).toEqual(5);
    });

    it('A numeric string of the specified length should be returned', async () => {
        const numStr = Verification.number(5);

        expect(numStr).toBeDefined();
        expect(numStr.length).toEqual(5);
        expect(numStr.split('').filter((s) => Verification.numbers.includes(s)).length).toEqual(5);
    });
});
