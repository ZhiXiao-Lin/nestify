export {
    API_VERSION_HEADER,
    DEFAULT_API_VERSION,
    ApiVersioningInterceptor,
    applyApiVersionHeaders,
    assertConsistentApiVersion,
    assertSupportedApiVersion,
    extractRequestedApiVersion,
    extractRequestedApiVersionCandidates,
    extractVersionFromCustomHeader,
    extractVersionFromHeader,
    extractVersionFromUrl,
    isSupportedApiVersion,
    normalizeApiVersion,
    resolveRequestedApiVersion,
    shouldBypassApiVersioning,
} from '@a3s-lab/http';
export type { ApiVersionedRequest, RequestedApiVersion, SupportedApiVersion } from '@a3s-lab/http';
