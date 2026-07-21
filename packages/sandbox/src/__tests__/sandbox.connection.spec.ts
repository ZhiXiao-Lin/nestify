import { createA3SBoxConnectionConfig } from '../sandbox.connection';
import { SandboxConfigurationError } from '../sandbox.errors';
import type { A3SConnectionOptions } from '../sandbox.types';

const invalidConnections: Array<[A3SConnectionOptions, string]> = [
    [{ apiUrl: '' }, 'apiUrl cannot be empty'],
    [{ apiUrl: 'box.test' }, 'absolute HTTP or HTTPS URL'],
    [{ apiUrl: 'ftp://api.box.test' }, 'absolute HTTP or HTTPS URL'],
    [{ apiUrl: 'https://api.box.test', domain: ' ' }, 'domain cannot be empty'],
    [{ apiUrl: 'https://api.box.test', apiKey: ' ' }, 'apiKey cannot be empty'],
    [{ apiUrl: 'https://api.box.test', sandboxUrl: ' ' }, 'sandboxUrl cannot be empty'],
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
        expect(
            createA3SBoxConnectionConfig({
                apiUrl: 'http://control.internal:3000',
                domain: 'sandboxes.example.test',
                sandboxUrl: 'https://fixture.example.test',
            }),
        ).toEqual({
            apiUrl: 'http://control.internal:3000',
            domain: 'sandboxes.example.test',
            validateApiKey: false,
            sandboxUrl: 'https://fixture.example.test',
        });
    });

    it('uses a non-api endpoint hostname as the derived domain', () => {
        expect(createA3SBoxConnectionConfig({ apiUrl: 'https://box.test/control' }).domain).toBe('box.test');
    });

    it.each(invalidConnections)('rejects invalid connection options %#', (options, message) => {
        expect(() => createA3SBoxConnectionConfig(options)).toThrow(SandboxConfigurationError);
        expect(() => createA3SBoxConnectionConfig(options)).toThrow(message);
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
