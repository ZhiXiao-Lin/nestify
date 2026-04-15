// ============================================================================
// Audit Decorators
// ============================================================================

import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

/**
 * Mark endpoint to be audited
 */
export const Audited = (resource?: string) => SetMetadata(AUDIT_KEY, { resource });
