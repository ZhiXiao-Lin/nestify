import { createA3SBoxConnectionConfig } from '../sandbox.connection';
import { SandboxConfigurationError } from '../sandbox.errors';
import type { A3SConnectionOptions } from '../sandbox.types';

const invalidConnections: Array<[A3SConnectionOptions, string]> = [
    [{ apiUrl: '' }, 'apiUrl cannot be empty'],
    [{ apiUrl: 'box.test' }, 'absolute HTTP or HTTPS URL'],
    [{ apiUrl: 'ftp://api.box.test' }, 'absolute HTTP or HTTPS URL'],
    [{ apiUrl: 'https://user:secret@api.box.test' }, 'apiUrl cannot contain embedded credentials'],
    [{ apiUrl: 'https://api.box.test?tenant=one' }, 'apiUrl cannot contain a query string or fragment'],
    [{ apiUrl: 'https://api.box.test#fragment' }, 'apiUrl cannot contain a query string or fragment'],
    [{ apiUrl: `https://${'x'.repeat(2_049)}` }, 'apiUrl cannot exceed 2048 characters'],
    [{ apiUrl: 'https://api.box.test', domain: ' ' }, 'domain cannot be empty'],
    [{ apiUrl: 'https://api.box.test', domain: 'https://box.test' }, 'valid hostname with an optional port'],
    [{ apiUrl: 'https://api.box.test', domain: 'box.test/path' }, 'valid hostname with an optional port'],
    [{ apiUrl: 'https://api.box.test', domain: 'user@box.test' }, 'valid hostname with an optional port'],
    [{ apiUrl: 'https://api.box.test', domain: '-box.test' }, 'valid hostname with an optional port'],
    [{ apiUrl: 'https://api.box.test', domain: 'box_test.invalid' }, 'valid hostname with an optional port'],
    [{ apiUrl: 'https://api.box.test', domain: 'box..test' }, 'valid hostname with an optional port'],
    [{ apiUrl: 'https://api.box.test', domain: 'x'.repeat(254) }, 'valid hostname with an optional port'],
    [{ apiUrl: 'https://api.box.test', domain: 'box.test:99999' }, 'valid hostname with an optional port'],
    [{ apiUrl: 'https://api.box.test', domain: 'x'.repeat(513) }, 'domain cannot exceed 512 characters'],
    [{ apiUrl: 'https://api.box.test', apiKey: ' ' }, 'apiKey cannot be empty'],
    [{ apiUrl: 'https://api.box.test', apiKey: ' key' }, 'apiKey cannot contain leading or trailing whitespace'],
    [{ apiUrl: 'https://api.box.test', apiKey: 'x'.repeat(8_193) }, 'apiKey cannot exceed 8192 characters'],
    [{ apiUrl: 'https://api.box.test', sandboxUrl: ' ' }, 'sandboxUrl cannot be empty'],
    [{ apiUrl: 'https://api.box.test', sandboxUrl: 'file:///tmp/box' }, 'absolute HTTP or HTTPS URL'],
    [{ apiUrl: 'https://api.box.test', sandboxUrl: 'https://user:secret@box.test' }, 'embedded credentials'],
    [{ apiUrl: 'https://api.box.test', sandboxUrl: `https://${'x'.repeat(2_049)}` }, 'cannot exceed 2048'],
];

describe('createA3SBoxConnectionConfig', () => {
    it('derives the sandbox domain and disables upstream API-key validation', () => {
        expect(
            createA3SBoxConnectionConfig({
                apiUrl: 'https://api.box.test',
                apiKey: 'a3s_test_key',
            }),
        ).toEqual({
            apiUrl: 'https://api.box.test',
            domain: 'box.test',
            validateApiKey: false,
            apiKey: 'a3s_test_key',
        });
    });

    it('uses an explicit domain and preserves a single-sandbox fixture URL', () => {
        const connection = createA3SBoxConnectionConfig({
            apiUrl: '  http://control.internal:3000  ',
            domain: '  Sandboxes.Example.Test:443  ',
            sandboxUrl: '  https://fixture.example.test/run?token=fixture  ',
        });

        expect(connection).toEqual({
            apiUrl: 'http://control.internal:3000',
            domain: 'sandboxes.example.test:443',
            validateApiKey: false,
            sandboxUrl: 'https://fixture.example.test/run?token=fixture',
        });
        expect(Object.isFrozen(connection)).toBe(true);
    });

    it('uses a non-api endpoint hostname as the derived domain', () => {
        expect(createA3SBoxConnectionConfig({ apiUrl: 'https://box.test/control' }).domain).toBe('box.test');
    });

    it('accepts IP literals and optional ports for explicit domains', () => {
        expect(createA3SBoxConnectionConfig({ apiUrl: 'https://api.box.test', domain: '127.0.0.1:3000' }).domain).toBe(
            '127.0.0.1:3000',
        );
        expect(createA3SBoxConnectionConfig({ apiUrl: 'https://api.box.test', domain: '[::1]:3000' }).domain).toBe(
            '[::1]:3000',
        );
    });

    it.each(invalidConnections)('rejects invalid connection options %#', (options, message) => {
        expect(() => createA3SBoxConnectionConfig(options)).toThrow(SandboxConfigurationError);
        expect(() => createA3SBoxConnectionConfig(options)).toThrow(message);
    });

    it('requires an object connection configuration', () => {
        expect(() => createA3SBoxConnectionConfig(undefined as unknown as A3SConnectionOptions)).toThrow(
            'connection options are required',
        );
        expect(() => createA3SBoxConnectionConfig({ apiUrl: 42 as unknown as string })).toThrow(
            'apiUrl cannot be empty',
        );
    });

    it('does not consult E2B environment variables', () => {
        const previousApiUrl = process.env.E2B_API_URL;
        const previousApiKey = process.env.E2B_API_KEY;
        process.env.E2B_API_URL = 'https://cloud.invalid';
        process.env.E2B_API_KEY = 'cloud-key';
        try {
            const connection = createA3SBoxConnectionConfig({ apiUrl: 'https://api.box.test' });
            expect(connection).toEqual({
                apiUrl: 'https://api.box.test',
                domain: 'box.test',
                validateApiKey: false,
            });
        } finally {
            restoreEnvironment('E2B_API_URL', previousApiUrl);
            restoreEnvironment('E2B_API_KEY', previousApiKey);
        }
    });
});

function restoreEnvironment(name: 'E2B_API_URL' | 'E2B_API_KEY', value: string | undefined): void {
    if (value === undefined) {
        delete process.env[name];
    } else {
        process.env[name] = value;
    }
}
