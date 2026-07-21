import { SandboxConfigurationError } from './sandbox.errors';
import type { A3SBoxConnectionConfig, A3SConnectionOptions } from './sandbox.types';

/**
 * Build the connection options consumed by the first-party A3S Box SDK.
 *
 * This deliberately mirrors `A3SConnectionConfig` without importing the ESM
 * SDK at runtime, keeping the package root safe to load from CommonJS.
 */
export function createA3SBoxConnectionConfig(options: A3SConnectionOptions): A3SBoxConnectionConfig {
    if (!options || typeof options !== 'object') {
        throw new SandboxConfigurationError('connection options are required');
    }
    if (typeof options.apiUrl !== 'string' || !options.apiUrl.trim()) {
        throw new SandboxConfigurationError('apiUrl cannot be empty');
    }

    const endpoint = parseEndpoint(options.apiUrl);
    const domain = options.domain ?? domainFromEndpoint(endpoint);
    if (typeof domain !== 'string' || !domain.trim()) {
        throw new SandboxConfigurationError('domain cannot be empty when provided');
    }
    validateOptionalSecret('apiKey', options.apiKey);
    validateOptionalSecret('sandboxUrl', options.sandboxUrl);

    return {
        apiUrl: options.apiUrl,
        domain,
        validateApiKey: false,
        ...(options.apiKey === undefined ? {} : { apiKey: options.apiKey }),
        ...(options.sandboxUrl === undefined ? {} : { sandboxUrl: options.sandboxUrl }),
    };
}

function parseEndpoint(apiUrl: string): URL {
    let endpoint: URL;
    try {
        endpoint = new URL(apiUrl);
    } catch {
        throw new SandboxConfigurationError('apiUrl must be an absolute HTTP or HTTPS URL');
    }
    if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') {
        throw new SandboxConfigurationError('apiUrl must be an absolute HTTP or HTTPS URL');
    }
    return endpoint;
}

function domainFromEndpoint(endpoint: URL): string {
    return endpoint.hostname.startsWith('api.') ? endpoint.hostname.slice(4) : endpoint.hostname;
}

function validateOptionalSecret(name: 'apiKey' | 'sandboxUrl', value: string | undefined): void {
    if (value !== undefined && (typeof value !== 'string' || !value.trim())) {
        throw new SandboxConfigurationError(`${name} cannot be empty when provided`);
    }
}
