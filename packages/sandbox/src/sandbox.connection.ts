import { SandboxConfigurationError } from './sandbox.errors';
import type { A3SBoxConnectionConfig, A3SConnectionOptions } from './sandbox.types';

const MAX_URL_LENGTH = 2_048;
const MAX_DOMAIN_LENGTH = 512;
const MAX_API_KEY_LENGTH = 8_192;

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
    const apiUrl = normalizeUrl('apiUrl', options.apiUrl);
    const endpoint = parseEndpoint(apiUrl, 'apiUrl');
    if (endpoint.search || endpoint.hash) {
        throw new SandboxConfigurationError('apiUrl cannot contain a query string or fragment');
    }
    const domain = normalizeDomain(options.domain ?? domainFromEndpoint(endpoint));
    const apiKey = normalizeApiKey(options.apiKey);
    const sandboxUrl = options.sandboxUrl === undefined ? undefined : normalizeUrl('sandboxUrl', options.sandboxUrl);
    if (sandboxUrl !== undefined) parseEndpoint(sandboxUrl, 'sandboxUrl');

    return Object.freeze({
        apiUrl,
        domain,
        validateApiKey: false,
        ...(apiKey === undefined ? {} : { apiKey }),
        ...(sandboxUrl === undefined ? {} : { sandboxUrl }),
    });
}

function parseEndpoint(url: string, name: 'apiUrl' | 'sandboxUrl'): URL {
    let endpoint: URL;
    try {
        endpoint = new URL(url);
    } catch {
        throw new SandboxConfigurationError(`${name} must be an absolute HTTP or HTTPS URL`);
    }
    if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') {
        throw new SandboxConfigurationError(`${name} must be an absolute HTTP or HTTPS URL`);
    }
    if (endpoint.username || endpoint.password) {
        throw new SandboxConfigurationError(`${name} cannot contain embedded credentials`);
    }
    return endpoint;
}

function domainFromEndpoint(endpoint: URL): string {
    return endpoint.hostname.startsWith('api.') ? endpoint.hostname.slice(4) : endpoint.hostname;
}

function normalizeUrl(name: 'apiUrl' | 'sandboxUrl', value: string): string {
    if (typeof value !== 'string' || !value.trim()) {
        throw new SandboxConfigurationError(`${name} cannot be empty${name === 'sandboxUrl' ? ' when provided' : ''}`);
    }
    const normalized = value.trim();
    if (normalized.length > MAX_URL_LENGTH) {
        throw new SandboxConfigurationError(`${name} cannot exceed ${MAX_URL_LENGTH} characters`);
    }
    return normalized;
}

function normalizeDomain(value: string): string {
    if (typeof value !== 'string' || !value.trim()) {
        throw new SandboxConfigurationError('domain cannot be empty when provided');
    }
    const normalized = value.trim();
    if (normalized.length > MAX_DOMAIN_LENGTH) {
        throw new SandboxConfigurationError(`domain cannot exceed ${MAX_DOMAIN_LENGTH} characters`);
    }
    let endpoint: URL;
    try {
        endpoint = new URL(`http://${normalized}`);
    } catch {
        throw new SandboxConfigurationError('domain must be a valid hostname with an optional port');
    }
    if (
        !endpoint.hostname ||
        !isValidDomainHostname(endpoint.hostname) ||
        endpoint.username ||
        endpoint.password ||
        endpoint.pathname !== '/' ||
        endpoint.search ||
        endpoint.hash
    ) {
        throw new SandboxConfigurationError('domain must be a valid hostname with an optional port');
    }
    return endpoint.host;
}

function isValidDomainHostname(hostname: string): boolean {
    if (hostname.startsWith('[') && hostname.endsWith(']')) return true;
    if (hostname.length > 253) return false;
    return hostname
        .split('.')
        .every(label => label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/iu.test(label));
}

function normalizeApiKey(value: string | undefined): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !value.trim()) {
        throw new SandboxConfigurationError('apiKey cannot be empty when provided');
    }
    if (value !== value.trim()) {
        throw new SandboxConfigurationError('apiKey cannot contain leading or trailing whitespace');
    }
    if (value.length > MAX_API_KEY_LENGTH) {
        throw new SandboxConfigurationError(`apiKey cannot exceed ${MAX_API_KEY_LENGTH} characters`);
    }
    return value;
}
