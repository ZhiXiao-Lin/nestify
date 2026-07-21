import { RetryAbortedError, RetryExhaustedError, RetryService } from '../retry';

describe('RetryService', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('retries matching error classes without the default predicate overriding the filter', async () => {
        class TemporaryError extends Error {}
        class FatalError extends Error {}
        const retry = new RetryService();
        const fatalOperation = jest.fn(async () => {
            throw new FatalError('fatal');
        });

        await expect(
            retry.execute(fatalOperation, {
                maxAttempts: 3,
                initialDelay: 0,
                maxDelay: 0,
                retryableErrors: [TemporaryError],
            }),
        ).resolves.toMatchObject({ success: false, attempts: 1, error: expect.any(FatalError) });
        expect(fatalOperation).toHaveBeenCalledTimes(1);

        const temporaryOperation = jest
            .fn<Promise<string>, []>()
            .mockRejectedValueOnce(new TemporaryError('temporary'))
            .mockResolvedValueOnce('ok');
        await expect(
            retry.execute(temporaryOperation, {
                maxAttempts: 2,
                initialDelay: 0,
                maxDelay: 0,
                retryableErrors: [TemporaryError],
            }),
        ).resolves.toMatchObject({ success: true, result: 'ok', attempts: 2 });
    });

    it('combines explicit class and predicate filters with OR semantics', async () => {
        class TemporaryError extends Error {}
        const retry = new RetryService();
        const operation = jest
            .fn<Promise<string>, []>()
            .mockRejectedValueOnce(new Error('predicate match'))
            .mockResolvedValueOnce('ok');
        const isRetryable = jest.fn((error: Error) => error.message.includes('predicate'));

        await expect(
            retry.execute(operation, {
                maxAttempts: 2,
                initialDelay: 0,
                maxDelay: 0,
                retryableErrors: [TemporaryError],
                isRetryable,
            }),
        ).resolves.toMatchObject({ success: true, attempts: 2 });
        expect(isRetryable).toHaveBeenCalledTimes(1);
    });

    it('normalizes non-Error failures and exposes the last error as the exhausted cause', async () => {
        const retry = new RetryService();

        const result = await retry.execute(async () => Promise.reject('offline'), { maxAttempts: 1 });
        expect(result).toMatchObject({ success: false, attempts: 1, error: { message: 'offline' } });

        let thrown: unknown;
        try {
            await retry.executeOrThrow(async () => Promise.reject('offline'), { maxAttempts: 1 });
        } catch (error) {
            thrown = error;
        }
        expect(thrown).toBeInstanceOf(RetryExhaustedError);
        expect((thrown as RetryExhaustedError).cause).toBe((thrown as RetryExhaustedError).lastError);
    });

    it('aborts before the first attempt and while waiting for another attempt', async () => {
        const retry = new RetryService();
        const beforeStart = new AbortController();
        const reason = new Error('request closed');
        beforeStart.abort(reason);
        const neverCalled = jest.fn(async () => 'no');

        await expect(retry.execute(neverCalled, { signal: beforeStart.signal })).resolves.toMatchObject({
            success: false,
            attempts: 0,
            error: expect.objectContaining({ name: 'RetryAbortedError', reason }),
        });
        expect(neverCalled).not.toHaveBeenCalled();

        const duringBackoff = new AbortController();
        const operation = jest.fn(async () => {
            throw new Error('temporary');
        });
        await expect(
            retry.execute(operation, {
                maxAttempts: 3,
                initialDelay: 100,
                maxDelay: 100,
                signal: duringBackoff.signal,
                onRetry: () => duringBackoff.abort(reason),
            }),
        ).resolves.toMatchObject({ success: false, attempts: 1, error: expect.any(RetryAbortedError) });
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it('lets cancellation win when an operation resolves after its signal is aborted', async () => {
        const retry = new RetryService();
        const controller = new AbortController();

        const result = await retry.execute(
            async () => {
                controller.abort('cancelled');
                return 'late value';
            },
            { signal: controller.signal },
        );

        expect(result).toMatchObject({ success: false, attempts: 1, error: expect.any(RetryAbortedError) });
        await expect(retry.executeOrThrow(async () => 'unused', { signal: controller.signal })).rejects.toBeInstanceOf(
            RetryAbortedError,
        );
    });

    it('replaces an operation failure with cancellation when the signal aborts in the attempt', async () => {
        const controller = new AbortController();
        const result = await new RetryService().execute(
            async () => {
                controller.abort('closed');
                throw new Error('stale failure');
            },
            { signal: controller.signal },
        );

        expect(result).toMatchObject({ success: false, attempts: 1, error: expect.any(RetryAbortedError) });
    });

    it('caps exponential backoff plus jitter at maxDelay', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(1);
        const retry = new RetryService();
        const controller = new AbortController();
        const onRetry = jest.fn((_attempt: number, _error: Error, _delay: number) => controller.abort());

        await retry.execute(
            async () => {
                throw new Error('temporary');
            },
            {
                maxAttempts: 2,
                initialDelay: 100,
                maxDelay: 110,
                jitterRatio: 1,
                signal: controller.signal,
                onRetry,
            },
        );

        expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), 110);
    });

    it.each([
        [{ maxAttempts: 0 }, 'maxAttempts'],
        [{ maxAttempts: 1.5 }, 'maxAttempts'],
        [{ initialDelay: -1 }, 'initialDelay'],
        [{ maxDelay: Number.MAX_SAFE_INTEGER }, 'maxDelay'],
        [{ backoffMultiplier: 0.5 }, 'backoffMultiplier'],
        [{ backoffMultiplier: Number.POSITIVE_INFINITY }, 'backoffMultiplier'],
        [{ jitterRatio: -0.1 }, 'jitterRatio'],
        [{ jitterRatio: 1.1 }, 'jitterRatio'],
        [{ retryableErrors: [null] }, 'retryableErrors'],
        [{ isRetryable: true }, 'isRetryable'],
        [{ onRetry: 'hook' }, 'onRetry'],
        [{ signal: {} }, 'signal'],
    ] as Array<[Record<string, unknown>, string]>)('rejects invalid option %#', async (options, message) => {
        await expect(new RetryService().execute(async () => 'ok', options as never)).rejects.toThrow(message);
    });

    it('rejects a missing operation and invalid options objects', async () => {
        const retry = new RetryService();
        await expect(retry.execute(undefined as never)).rejects.toThrow('operation must be a function');
        await expect(retry.execute(async () => 'ok', null as never)).rejects.toThrow('options must be an object');
    });
});
