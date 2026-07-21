import { readRecord, sleep } from '../utils';

describe('resilience internal utilities', () => {
    it('reads records without treating primitives as records', () => {
        const record = { value: 1 };
        expect(readRecord(record)).toBe(record);
        expect(readRecord(null)).toEqual({});
        expect(readRecord('value')).toEqual({});
    });

    it('resolves a real delay and removes its abort listener', async () => {
        const controller = new AbortController();
        const remove = jest.spyOn(controller.signal, 'removeEventListener');

        await expect(sleep(1, controller.signal)).resolves.toBeUndefined();
        expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    });

    it('cancels an active timer with the signal reason', async () => {
        const controller = new AbortController();
        const reason = new Error('cancelled');
        const sleeping = sleep(1_000, controller.signal);
        controller.abort(reason);

        await expect(sleeping).rejects.toBe(reason);
    });
});
