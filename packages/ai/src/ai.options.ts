import { AiConfigurationError } from './ai.errors';
import type { AiModuleOptions } from './ai.types';

/** Validate and detach module options from caller-owned mutable objects. */
export function normalizeAiModuleOptions(options: AiModuleOptions): Readonly<AiModuleOptions> {
    if (typeof options !== 'object' || options === null || Array.isArray(options)) {
        throw new AiConfigurationError('AiModule options are required');
    }

    const configSource = options.configSource;
    if (typeof configSource !== 'string' || configSource.trim().length === 0) {
        throw new AiConfigurationError('AiModule requires a non-empty configSource');
    }
    if (configSource.includes('\0')) {
        throw new AiConfigurationError('AiModule configSource cannot contain a null byte');
    }

    const eager = optionalBoolean('eager', options.eager);
    const isGlobal = optionalBoolean('isGlobal', options.isGlobal);
    if (options.runtimeLoader !== undefined && typeof options.runtimeLoader !== 'function') {
        throw new AiConfigurationError('AiModule runtimeLoader must be a function');
    }

    return Object.freeze({
        configSource,
        ...(eager === undefined ? {} : { eager }),
        ...(isGlobal === undefined ? {} : { isGlobal }),
        ...(options.runtimeLoader === undefined ? {} : { runtimeLoader: options.runtimeLoader }),
    });
}

function optionalBoolean(name: string, value: unknown): boolean | undefined {
    if (value !== undefined && typeof value !== 'boolean') {
        throw new AiConfigurationError(`AiModule ${name} must be a boolean`);
    }
    return value as boolean | undefined;
}
