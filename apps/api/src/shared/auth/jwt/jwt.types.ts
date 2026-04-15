// ============================================================================
// JWT Types
// ============================================================================

/**
 * JWT Payload - contains user information stored in the token
 */
export interface JwtPayload {
    /** User ID */
    sub: string;
    /** User email */
    email: string;
    /** Organization/Tenant ID */
    organizationId: string;
    /** User roles */
    roles: string[];
    /** Permissions (optional, can be computed from roles) */
    permissions?: string[];
    /** Token type: access or refresh */
    type: 'access' | 'refresh';
    /** Issued at timestamp */
    iat?: number;
    /** Expiration timestamp */
    exp?: number;
}

/**
 * Access Token
 */
export interface AccessToken {
    token: string;
    expiresIn: string;
}

/**
 * Refresh Token
 */
export interface RefreshToken {
    token: string;
    expiresIn: string;
}

/**
 * Token Pair - both access and refresh tokens
 */
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

/**
 * Token Response - returned to client after login
 */
export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
}
